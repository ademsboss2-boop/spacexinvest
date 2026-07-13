begin;

-- =========================================================
-- ADMIN ROLE HELPER
-- Only users with the explicit admin role return true.
-- =========================================================

create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all
on function public.is_staff_admin()
from public, anon;

grant execute
on function public.is_staff_admin()
to authenticated;


-- =========================================================
-- STAFF ROLE AUDIT LOG
-- Permanent history of assignments, changes, and revocations.
-- Email/name snapshots remain available if an account is deleted.
-- =========================================================

create table if not exists public.staff_role_audit_log (
  id uuid primary key default gen_random_uuid(),

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  target_user_id uuid
    references auth.users(id)
    on delete set null,

  action_type text not null
    check (
      action_type in (
        'baseline',
        'assigned',
        'role_changed',
        'revoked'
      )
    ),

  previous_role text
    check (
      previous_role is null
      or previous_role in ('reviewer', 'admin')
    ),

  new_role text
    check (
      new_role is null
      or new_role in ('reviewer', 'admin')
    ),

  actor_email text,
  actor_display_name text,
  target_email text,
  target_display_name text,

  created_at timestamp with time zone
    not null default now()
);

create index if not exists
  staff_role_audit_created_idx
on public.staff_role_audit_log (
  created_at desc
);

create index if not exists
  staff_role_audit_target_idx
on public.staff_role_audit_log (
  target_user_id,
  created_at desc
);

alter table public.staff_role_audit_log
enable row level security;

drop policy if exists
  "staff_role_audit_select_admin"
on public.staff_role_audit_log;

create policy "staff_role_audit_select_admin"
on public.staff_role_audit_log
for select
to authenticated
using (public.is_staff_admin());

revoke insert, update, delete
on public.staff_role_audit_log
from anon, authenticated;

grant select
on public.staff_role_audit_log
to authenticated;


-- =========================================================
-- AUTOMATIC STAFF ROLE AUDITING
-- Captures role changes regardless of whether they come from
-- the management RPC or another privileged backend process.
-- =========================================================

create or replace function public.record_staff_role_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_user_id uuid;
  v_target_user_id uuid;

  v_action_type text;
  v_previous_role text;
  v_new_role text;

  v_actor_email text;
  v_actor_display_name text;
  v_target_email text;
  v_target_display_name text;
begin
  if tg_op = 'UPDATE'
     and old.role is not distinct from new.role then
    return new;
  end if;

  v_actor_user_id := auth.uid();

  if tg_op = 'INSERT' then
    v_target_user_id := new.user_id;
    v_action_type := 'assigned';
    v_previous_role := null;
    v_new_role := new.role;

  elsif tg_op = 'UPDATE' then
    v_target_user_id := new.user_id;
    v_action_type := 'role_changed';
    v_previous_role := old.role;
    v_new_role := new.role;

  elsif tg_op = 'DELETE' then
    v_target_user_id := old.user_id;
    v_action_type := 'revoked';
    v_previous_role := old.role;
    v_new_role := null;
  end if;

  if v_actor_user_id is not null then
    select
      user_record.email::text,
      profile.display_name
    into
      v_actor_email,
      v_actor_display_name
    from auth.users as user_record
    left join public.profiles as profile
      on profile.id = user_record.id
    where user_record.id = v_actor_user_id;
  end if;

  select
    user_record.email::text,
    profile.display_name
  into
    v_target_email,
    v_target_display_name
  from auth.users as user_record
  left join public.profiles as profile
    on profile.id = user_record.id
  where user_record.id = v_target_user_id;

  insert into public.staff_role_audit_log (
    actor_user_id,
    target_user_id,
    action_type,
    previous_role,
    new_role,
    actor_email,
    actor_display_name,
    target_email,
    target_display_name
  )
  values (
    v_actor_user_id,
    v_target_user_id,
    v_action_type,
    v_previous_role,
    v_new_role,
    v_actor_email,
    v_actor_display_name,
    v_target_email,
    v_target_display_name
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists
  on_staff_role_changed
on public.staff_roles;

create trigger on_staff_role_changed
after insert or update of role or delete
on public.staff_roles
for each row
execute function public.record_staff_role_audit();


-- =========================================================
-- BASELINE CURRENT STAFF
-- Gives existing staff members a starting audit record.
-- =========================================================

insert into public.staff_role_audit_log (
  actor_user_id,
  target_user_id,
  action_type,
  previous_role,
  new_role,
  actor_email,
  actor_display_name,
  target_email,
  target_display_name,
  created_at
)
select
  null,
  staff.user_id,
  'baseline',
  null,
  staff.role,
  null,
  null,
  user_record.email::text,
  profile.display_name,
  staff.created_at
from public.staff_roles as staff
join auth.users as user_record
  on user_record.id = staff.user_id
left join public.profiles as profile
  on profile.id = staff.user_id
where not exists (
  select 1
  from public.staff_role_audit_log as audit
  where audit.target_user_id = staff.user_id
    and audit.action_type = 'baseline'
);


-- =========================================================
-- LIST CURRENT STAFF
-- Returns staff account details only to administrators.
-- =========================================================

create or replace function public.list_staff_members()
returns table (
  staff_user_id uuid,
  staff_email text,
  staff_display_name text,
  staff_role text,
  staff_since timestamp with time zone,
  email_confirmed boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_staff_admin() then
    raise exception 'Administrator access required.'
      using errcode = '42501';
  end if;

  return query
  select
    staff.user_id,
    user_record.email::text,
    coalesce(
      nullif(btrim(profile.display_name), ''),
      split_part(user_record.email::text, '@', 1),
      'Staff Member'
    ),
    staff.role,
    staff.created_at,
    user_record.email_confirmed_at is not null
  from public.staff_roles as staff
  join auth.users as user_record
    on user_record.id = staff.user_id
  left join public.profiles as profile
    on profile.id = staff.user_id
  order by
    case when staff.role = 'admin' then 0 else 1 end,
    staff.created_at asc;
end;
$$;


-- =========================================================
-- LIST STAFF ROLE HISTORY
-- Returns the latest administrative access events.
-- =========================================================

create or replace function public.list_staff_role_audit(
  p_limit integer default 100
)
returns table (
  audit_id uuid,
  actor_user_id uuid,
  actor_email text,
  actor_display_name text,
  target_user_id uuid,
  target_email text,
  target_display_name text,
  action_type text,
  previous_role text,
  new_role text,
  created_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_staff_admin() then
    raise exception 'Administrator access required.'
      using errcode = '42501';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 100), 500));

  return query
  select
    audit.id,
    audit.actor_user_id,
    audit.actor_email,
    audit.actor_display_name,
    audit.target_user_id,
    audit.target_email,
    audit.target_display_name,
    audit.action_type,
    audit.previous_role,
    audit.new_role,
    audit.created_at
  from public.staff_role_audit_log as audit
  order by audit.created_at desc
  limit v_limit;
end;
$$;


-- =========================================================
-- ASSIGN OR CHANGE A STAFF ROLE
-- Only confirmed, existing accounts can receive staff access.
-- Reviewers cannot call this function.
-- The final administrator cannot be demoted.
-- =========================================================

create or replace function public.set_staff_role(
  p_email text,
  p_role text
)
returns table (
  staff_user_id uuid,
  staff_email text,
  staff_display_name text,
  staff_role text,
  staff_since timestamp with time zone,
  email_confirmed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_target_user_id uuid;
  v_target_email text;
  v_confirmed_at timestamp with time zone;
  v_current_role text;
  v_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_staff_admin() then
    raise exception 'Administrator access required.'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_email, '')), '') is null then
    raise exception 'A staff account email is required.'
      using errcode = '22023';
  end if;

  if p_role not in ('reviewer', 'admin') then
    raise exception 'Invalid staff role.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(913027451);

  select
    user_record.id,
    user_record.email::text,
    user_record.email_confirmed_at
  into
    v_target_user_id,
    v_target_email,
    v_confirmed_at
  from auth.users as user_record
  where lower(user_record.email::text) =
    lower(btrim(p_email))
  limit 1;

  if v_target_user_id is null then
    raise exception
      'No registered account was found for that email address.'
      using errcode = 'P0002';
  end if;

  if v_confirmed_at is null then
    raise exception
      'The account email must be verified before staff access can be assigned.'
      using errcode = '22023';
  end if;

  select staff.role
  into v_current_role
  from public.staff_roles as staff
  where staff.user_id = v_target_user_id;

  if v_current_role = 'admin'
     and p_role = 'reviewer' then
    select count(*)
    into v_admin_count
    from public.staff_roles
    where role = 'admin';

    if v_admin_count <= 1 then
      raise exception
        'The final administrator cannot be demoted.'
        using errcode = '22023';
    end if;
  end if;

  if v_current_role is null then
    insert into public.staff_roles (
      user_id,
      role
    )
    values (
      v_target_user_id,
      p_role
    );

  elsif v_current_role <> p_role then
    update public.staff_roles
    set role = p_role
    where user_id = v_target_user_id;
  end if;

  return query
  select
    staff.user_id,
    user_record.email::text,
    coalesce(
      nullif(btrim(profile.display_name), ''),
      split_part(user_record.email::text, '@', 1),
      'Staff Member'
    ),
    staff.role,
    staff.created_at,
    user_record.email_confirmed_at is not null
  from public.staff_roles as staff
  join auth.users as user_record
    on user_record.id = staff.user_id
  left join public.profiles as profile
    on profile.id = staff.user_id
  where staff.user_id = v_target_user_id;
end;
$$;


-- =========================================================
-- REVOKE STAFF ACCESS
-- The final administrator cannot be removed.
-- =========================================================

create or replace function public.remove_staff_role(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_role text;
  v_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_staff_admin() then
    raise exception 'Administrator access required.'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'A staff user ID is required.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(913027451);

  select staff.role
  into v_current_role
  from public.staff_roles as staff
  where staff.user_id = p_user_id;

  if v_current_role is null then
    raise exception 'Staff role not found.'
      using errcode = 'P0002';
  end if;

  if v_current_role = 'admin' then
    select count(*)
    into v_admin_count
    from public.staff_roles
    where role = 'admin';

    if v_admin_count <= 1 then
      raise exception
        'The final administrator cannot be removed.'
        using errcode = '22023';
    end if;
  end if;

  delete from public.staff_roles
  where user_id = p_user_id;

  return true;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- Every function performs its own administrator check.
-- =========================================================

revoke all
on function public.list_staff_members()
from public, anon;

revoke all
on function public.list_staff_role_audit(integer)
from public, anon;

revoke all
on function public.set_staff_role(text, text)
from public, anon;

revoke all
on function public.remove_staff_role(uuid)
from public, anon;

grant execute
on function public.list_staff_members()
to authenticated;

grant execute
on function public.list_staff_role_audit(integer)
to authenticated;

grant execute
on function public.set_staff_role(text, text)
to authenticated;

grant execute
on function public.remove_staff_role(uuid)
to authenticated;


-- =========================================================
-- DIRECT STAFF ROLE WRITES REMAIN DISABLED
-- Role changes must pass through the protected functions.
-- =========================================================

revoke insert, update, delete
on public.staff_roles
from anon, authenticated;

commit;
