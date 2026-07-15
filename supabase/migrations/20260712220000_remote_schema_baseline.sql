begin;

-- =========================================================
-- FOUNDATIONAL INVESTOR SCHEMA BASELINE
--
-- Reconstructed from the hosted public-schema snapshot and the
-- migration dependencies that precede 20260712223000.
--
-- This migration intentionally contains only foundational objects
-- that are absent from the tracked migration chain. Later audit,
-- staff-management, funding, portfolio, and withdrawal objects stay
-- in their existing migrations.
-- =========================================================

-- =========================================================
-- CORE TABLES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  display_name text not null default '',

  created_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,
  title text not null,
  category text not null,
  subtitle text not null,
  summary text not null,

  minimum_investment numeric(14, 2) not null
    check (minimum_investment > 0),

  media text not null,
  overview text not null,
  investment_thesis text not null,

  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),

  risks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(risks) = 'array'),

  metrics jsonb not null default '[]'::jsonb
    check (jsonb_typeof(metrics) = 'array'),

  status text not null default 'Coming Soon',
  is_published boolean not null default true,

  created_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now()
);

create table if not exists public.staff_roles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  role text not null
    constraint staff_roles_role_check
    check (role in ('reviewer', 'admin')),

  created_at timestamp with time zone
    not null default now()
);

create table if not exists public.investment_applications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  opportunity_id uuid not null
    references public.opportunities(id)
    on delete restrict,

  amount numeric(14, 2) not null
    check (amount > 0),

  status text not null default 'submitted'
    check (
      status in (
        'draft',
        'submitted',
        'under_review',
        'approved',
        'declined',
        'cancelled'
      )
    ),

  reference_code text not null unique
    default (
      'SX-' ||
      upper(
        substr(
          replace(gen_random_uuid()::text, '-', ''),
          1,
          12
        )
      )
    ),

  submitted_at timestamp with time zone
    not null default now(),

  created_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now()
);

create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  opportunity_id uuid not null
    references public.opportunities(id)
    on delete cascade,

  created_at timestamp with time zone
    not null default now(),

  unique (user_id, opportunity_id)
);

create table if not exists public.application_activity (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.investment_applications(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  event_type text not null,
  message text not null,

  created_at timestamp with time zone
    not null default now(),

  read_at timestamp with time zone
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists opportunities_published_idx
on public.opportunities (
  is_published,
  created_at desc
);

create index if not exists investment_applications_opportunity_idx
on public.investment_applications (opportunity_id);

create index if not exists investment_applications_user_idx
on public.investment_applications (
  user_id,
  created_at desc
);

create index if not exists saved_opportunities_user_idx
on public.saved_opportunities (
  user_id,
  created_at desc
);

create index if not exists application_activity_application_idx
on public.application_activity (
  application_id,
  created_at desc
);

create index if not exists application_activity_user_idx
on public.application_activity (
  user_id,
  created_at desc
);

create index if not exists application_activity_user_unread_idx
on public.application_activity (
  user_id,
  created_at desc
)
where read_at is null;

-- =========================================================
-- FOUNDATIONAL HELPERS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (
    id,
    display_name
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Investor'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Use the current AAL2 requirement in the reconstructed baseline so
-- accidentally executing this historical migration cannot downgrade
-- staff authorization on an existing environment. The later MFA
-- migration safely replaces this function with the same requirement.
create or replace function public.is_application_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(
      (select auth.jwt() ->> 'aal'),
      ''
    ) = 'aal2'
    and exists (
      select 1
      from public.staff_roles
      where user_id = (select auth.uid())
        and role in ('reviewer', 'admin')
    );
$$;

create or replace function public.validate_application_minimum()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  required_minimum numeric(14, 2);
begin
  select opportunity.minimum_investment
  into required_minimum
  from public.opportunities as opportunity
  where opportunity.id = new.opportunity_id
    and opportunity.is_published = true;

  if required_minimum is null then
    raise exception 'Opportunity is unavailable.';
  end if;

  if new.amount < required_minimum then
    raise exception
      'Investment amount must be at least %.',
      required_minimum;
  end if;

  return new;
end;
$$;

create or replace function public.record_application_submission()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.application_activity (
    application_id,
    user_id,
    event_type,
    message
  )
  values (
    new.id,
    new.user_id,
    'submitted',
    'Investment application submitted.'
  );

  return new;
end;
$$;

create or replace function public.log_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.application_activity (
      application_id,
      user_id,
      event_type,
      message
    )
    values (
      new.id,
      new.user_id,
      new.status,
      'Application status changed from '
        || initcap(replace(old.status, '_', ' '))
        || ' to '
        || initcap(replace(new.status, '_', ' '))
        || '.'
    );
  end if;

  return new;
end;
$$;

create or replace function public.mark_application_activity_read(
  activity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_rows integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.application_activity as activity
  set read_at = coalesce(activity.read_at, now())
  where activity.id = activity_id
    and activity.user_id = auth.uid();

  get diagnostics updated_rows = row_count;

  return updated_rows > 0;
end;
$$;

create or replace function public.mark_all_application_activity_read()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_rows integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  update public.application_activity as activity
  set read_at = now()
  where activity.user_id = auth.uid()
    and activity.read_at is null;

  get diagnostics updated_rows = row_count;

  return updated_rows;
end;
$$;

-- =========================================================
-- TRIGGERS
-- =========================================================

-- The public-only schema dump cannot include a trigger attached to
-- auth.users. Create the profile trigger only when no existing trigger
-- on auth.users already calls public.handle_new_user().
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    join pg_catalog.pg_proc as function_record
      on function_record.oid = trigger_record.tgfoid
    join pg_catalog.pg_namespace as function_schema
      on function_schema.oid = function_record.pronamespace
    join pg_catalog.pg_class as table_record
      on table_record.oid = trigger_record.tgrelid
    join pg_catalog.pg_namespace as table_schema
      on table_schema.oid = table_record.relnamespace
    where trigger_record.tgisinternal = false
      and function_schema.nspname = 'public'
      and function_record.proname = 'handle_new_user'
      and table_schema.nspname = 'auth'
      and table_record.relname = 'users'
  ) then
    execute $trigger$
      create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user()
    $trigger$;
  end if;
end;
$$;

drop trigger if exists profiles_set_updated_at
on public.profiles;

create trigger profiles_set_updated_at
before update
on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists opportunities_set_updated_at
on public.opportunities;

create trigger opportunities_set_updated_at
before update
on public.opportunities
for each row
execute function public.set_updated_at();

drop trigger if exists investment_applications_set_updated_at
on public.investment_applications;

create trigger investment_applications_set_updated_at
before update
on public.investment_applications
for each row
execute function public.set_updated_at();

drop trigger if exists validate_investment_application_minimum
on public.investment_applications;

create trigger validate_investment_application_minimum
before insert or update of amount, opportunity_id
on public.investment_applications
for each row
execute function public.validate_application_minimum();

drop trigger if exists on_application_submitted
on public.investment_applications;

create trigger on_application_submitted
after insert
on public.investment_applications
for each row
execute function public.record_application_submission();

drop trigger if exists on_application_status_changed
on public.investment_applications;

create trigger on_application_status_changed
after update of status
on public.investment_applications
for each row
when (old.status is distinct from new.status)
execute function public.log_application_status_change();

-- =========================================================
-- ROW-LEVEL SECURITY
-- =========================================================

alter table public.profiles
  enable row level security;

alter table public.opportunities
  enable row level security;

alter table public.staff_roles
  enable row level security;

alter table public.investment_applications
  enable row level security;

alter table public.saved_opportunities
  enable row level security;

alter table public.application_activity
  enable row level security;

-- Profiles

drop policy if exists "Users can insert own profile"
on public.profiles;

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile"
on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_select_own"
on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_select_staff"
on public.profiles;

create policy "profiles_select_staff"
on public.profiles
for select
to authenticated
using (public.is_application_reviewer());

drop policy if exists "profiles_update_own"
on public.profiles;

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Opportunities

drop policy if exists "opportunities_read_published"
on public.opportunities;

create policy "opportunities_read_published"
on public.opportunities
for select
to anon, authenticated
using (is_published = true);

-- Staff roles

drop policy if exists "staff_roles_select_own"
on public.staff_roles;

create policy "staff_roles_select_own"
on public.staff_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Applications

drop policy if exists "Users can create their own applications"
on public.investment_applications;

create policy "Users can create their own applications"
on public.investment_applications
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'submitted'
);

drop policy if exists "applications_select_own"
on public.investment_applications;

create policy "applications_select_own"
on public.investment_applications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "applications_select_staff"
on public.investment_applications;

create policy "applications_select_staff"
on public.investment_applications
for select
to authenticated
using (public.is_application_reviewer());

-- Saved opportunities

drop policy if exists "saved_opportunities_select_own"
on public.saved_opportunities;

create policy "saved_opportunities_select_own"
on public.saved_opportunities
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "saved_opportunities_insert_own"
on public.saved_opportunities;

create policy "saved_opportunities_insert_own"
on public.saved_opportunities
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "saved_opportunities_delete_own"
on public.saved_opportunities;

create policy "saved_opportunities_delete_own"
on public.saved_opportunities
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Application activity

drop policy if exists "application_activity_select_own"
on public.application_activity;

create policy "application_activity_select_own"
on public.application_activity
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "application_activity_select_staff"
on public.application_activity;

create policy "application_activity_select_staff"
on public.application_activity
for select
to authenticated
using (public.is_application_reviewer());

-- =========================================================
-- PRIVILEGES
-- =========================================================

revoke all
on public.profiles,
   public.opportunities,
   public.staff_roles,
   public.investment_applications,
   public.saved_opportunities,
   public.application_activity
from anon, authenticated;

grant select, update
on public.profiles
to authenticated;

grant select
on public.opportunities
to anon, authenticated;

grant select
on public.staff_roles
to authenticated;

grant select, insert
on public.investment_applications
to authenticated;

grant select, insert, delete
on public.saved_opportunities
to authenticated;

grant select
on public.application_activity
to authenticated;

grant all
on public.profiles,
   public.opportunities,
   public.staff_roles,
   public.investment_applications,
   public.saved_opportunities,
   public.application_activity
to service_role;

revoke all
on function public.is_application_reviewer()
from public, anon;

grant execute
on function public.is_application_reviewer()
to authenticated, service_role;

revoke all
on function public.mark_application_activity_read(uuid)
from public, anon;

grant execute
on function public.mark_application_activity_read(uuid)
to authenticated, service_role;

revoke all
on function public.mark_all_application_activity_read()
from public, anon;

grant execute
on function public.mark_all_application_activity_read()
to authenticated, service_role;

-- Preserve the existing hosted function ACLs for foundational
-- trigger helpers so a fresh replay matches the current schema.

grant all
on function public.handle_new_user()
to anon, authenticated, service_role;

revoke all
on function public.log_application_status_change()
from public;

grant all
on function public.log_application_status_change()
to anon, authenticated, service_role;

grant all
on function public.record_application_submission()
to anon, authenticated, service_role;

grant all
on function public.set_updated_at()
to anon, authenticated, service_role;

grant all
on function public.validate_application_minimum()
to anon, authenticated, service_role;

commit;
