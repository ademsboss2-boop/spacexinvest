begin;

-- =========================================================
-- SECURITY EVENT LOG
-- Append-only account and privileged-access history.
-- Never stores passwords, MFA codes, secrets, or tokens.
-- =========================================================

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  actor_email text,
  actor_display_name text,

  staff_role text
    check (
      staff_role is null
      or staff_role in ('reviewer', 'admin')
    ),

  event_type text not null
    check (
      event_type in (
        'mfa_enrolled',
        'mfa_verified',
        'mfa_verification_failed',
        'mfa_factor_removed',
        'privileged_challenge_required',
        'privileged_access_denied',
        'other_sessions_signed_out',
        'session_control_failed'
      )
    ),

  assurance_level text
    check (
      assurance_level is null
      or assurance_level in ('aal1', 'aal2')
    ),

  session_id text,

  metadata jsonb
    not null default '{}'::jsonb,

  created_at timestamp with time zone
    not null default now()
);

create index if not exists
  security_events_actor_created_idx
on public.security_events (
  actor_user_id,
  created_at desc
);

create index if not exists
  security_events_type_created_idx
on public.security_events (
  event_type,
  created_at desc
);

create index if not exists
  security_events_created_idx
on public.security_events (
  created_at desc
);

alter table public.security_events
enable row level security;


-- =========================================================
-- SECURITY EVENT VISIBILITY
-- Users may inspect their own history.
-- MFA-verified administrators may inspect all events.
-- =========================================================

drop policy if exists
  "security_events_select_own_or_admin"
on public.security_events;

create policy "security_events_select_own_or_admin"
on public.security_events
for select
to authenticated
using (
  actor_user_id = (select auth.uid())
  or public.is_staff_admin()
);

grant select
on public.security_events
to authenticated;

revoke insert, update, delete
on public.security_events
from anon, authenticated;


-- =========================================================
-- SECURITY EVENT RECORDING RPC
-- Derives identity, session, role, and AAL from the JWT.
-- Client metadata is restricted and size-limited.
-- =========================================================

create or replace function public.record_security_event(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event_id uuid;
  v_user_id uuid;
  v_email text;
  v_display_name text;
  v_staff_role text;
  v_aal text;
  v_session_id text;
  v_metadata jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if p_event_type not in (
    'mfa_enrolled',
    'mfa_verified',
    'mfa_verification_failed',
    'mfa_factor_removed',
    'privileged_challenge_required',
    'privileged_access_denied',
    'other_sessions_signed_out',
    'session_control_failed'
  ) then
    raise exception 'Invalid security event type.'
      using errcode = '22023';
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb);

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception
      'Security event metadata must be a JSON object.'
      using errcode = '22023';
  end if;

  if octet_length(v_metadata::text) > 4096 then
    raise exception
      'Security event metadata is too large.'
      using errcode = '22023';
  end if;

  if v_metadata ?| array[
    'password',
    'code',
    'secret',
    'token',
    'access_token',
    'refresh_token',
    'qr_code'
  ] then
    raise exception
      'Sensitive authentication data cannot be logged.'
      using errcode = '22023';
  end if;

  v_aal := nullif(auth.jwt() ->> 'aal', '');
  v_session_id := nullif(auth.jwt() ->> 'session_id', '');

  select staff.role
  into v_staff_role
  from public.staff_roles as staff
  where staff.user_id = v_user_id;

  if p_event_type in (
    'privileged_challenge_required',
    'privileged_access_denied'
  )
  and v_staff_role is null then
    raise exception
      'This event is restricted to staff accounts.'
      using errcode = '42501';
  end if;

  if p_event_type in (
    'mfa_enrolled',
    'mfa_verified',
    'mfa_factor_removed'
  )
  and v_aal <> 'aal2' then
    raise exception
      'An MFA-verified session is required for this event.'
      using errcode = '42501';
  end if;

  if p_event_type = 'other_sessions_signed_out'
     and v_staff_role is not null
     and v_aal <> 'aal2' then
    raise exception
      'Staff must verify MFA before managing sessions.'
      using errcode = '42501';
  end if;

  select
    user_record.email::text,
    coalesce(
      nullif(btrim(profile.display_name), ''),
      split_part(user_record.email::text, '@', 1),
      'Account'
    )
  into
    v_email,
    v_display_name
  from auth.users as user_record
  left join public.profiles as profile
    on profile.id = user_record.id
  where user_record.id = v_user_id;

  insert into public.security_events (
    actor_user_id,
    actor_email,
    actor_display_name,
    staff_role,
    event_type,
    assurance_level,
    session_id,
    metadata
  )
  values (
    v_user_id,
    v_email,
    v_display_name,
    v_staff_role,
    p_event_type,
    v_aal,
    v_session_id,
    jsonb_build_object(
      'reporting_source',
      'authenticated_client'
    ) || v_metadata
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.record_security_event(text, jsonb)
from public, anon;

grant execute
on function public.record_security_event(text, jsonb)
to authenticated;

commit;
