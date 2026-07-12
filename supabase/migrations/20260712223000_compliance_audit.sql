begin;

-- =========================================================
-- COMPLIANCE AUDIT LOG
-- Append-only history for staff actions and status changes.
-- =========================================================

create table if not exists public.application_audit_log (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.investment_applications(id)
    on delete cascade,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  action_type text not null
    check (
      action_type in (
        'baseline',
        'status_changed',
        'note_added'
      )
    ),

  previous_status text,
  new_status text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone
    not null default now()
);

create index if not exists
  application_audit_log_application_created_idx
on public.application_audit_log (
  application_id,
  created_at desc
);

create index if not exists
  application_audit_log_actor_created_idx
on public.application_audit_log (
  actor_user_id,
  created_at desc
);

alter table public.application_audit_log
enable row level security;

drop policy if exists
  "application_audit_log_select_staff"
on public.application_audit_log;

create policy "application_audit_log_select_staff"
on public.application_audit_log
for select
to authenticated
using (public.is_application_reviewer());

-- No client-side INSERT, UPDATE, or DELETE policies.
-- Records are written only by protected functions and triggers.

revoke insert, update, delete
on public.application_audit_log
from anon, authenticated;

grant select
on public.application_audit_log
to authenticated;


-- =========================================================
-- PRIVATE INTERNAL REVIEW NOTES
-- Notes are append-only and visible only to authorized staff.
-- =========================================================

create table if not exists public.application_review_notes (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.investment_applications(id)
    on delete cascade,

  author_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  note text not null
    check (
      char_length(btrim(note)) between 1 and 2000
    ),

  created_at timestamp with time zone
    not null default now()
);

create index if not exists
  application_review_notes_application_created_idx
on public.application_review_notes (
  application_id,
  created_at desc
);

alter table public.application_review_notes
enable row level security;

drop policy if exists
  "application_review_notes_select_staff"
on public.application_review_notes;

create policy "application_review_notes_select_staff"
on public.application_review_notes
for select
to authenticated
using (public.is_application_reviewer());

revoke insert, update, delete
on public.application_review_notes
from anon, authenticated;

grant select
on public.application_review_notes
to authenticated;


-- =========================================================
-- AUTOMATIC STATUS AUDIT TRIGGER
-- Captures every status change, including changes performed
-- by protected RPC functions or privileged backend processes.
-- =========================================================

create or replace function
public.record_application_status_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.application_audit_log (
      application_id,
      actor_user_id,
      action_type,
      previous_status,
      new_status,
      metadata
    )
    values (
      new.id,
      auth.uid(),
      'status_changed',
      old.status,
      new.status,
      jsonb_build_object(
        'reference_code',
        new.reference_code
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists
  on_application_status_audited
on public.investment_applications;

create trigger on_application_status_audited
after update of status
on public.investment_applications
for each row
when (old.status is distinct from new.status)
execute function public.record_application_status_audit();


-- =========================================================
-- AUTOMATIC NOTE AUDIT TRIGGER
-- Records that a note was created without exposing its private
-- content inside the general audit log.
-- =========================================================

create or replace function
public.record_application_note_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.application_audit_log (
    application_id,
    actor_user_id,
    action_type,
    metadata
  )
  values (
    new.application_id,
    new.author_user_id,
    'note_added',
    jsonb_build_object(
      'note_id',
      new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists
  on_application_review_note_created
on public.application_review_notes;

create trigger on_application_review_note_created
after insert
on public.application_review_notes
for each row
execute function public.record_application_note_audit();


-- =========================================================
-- BASELINE EXISTING APPLICATIONS
-- Gives every existing application a starting compliance record.
-- =========================================================

insert into public.application_audit_log (
  application_id,
  actor_user_id,
  action_type,
  previous_status,
  new_status,
  metadata,
  created_at
)
select
  application.id,
  null,
  'baseline',
  null,
  application.status,
  jsonb_build_object(
    'source',
    'compliance_migration',
    'reference_code',
    application.reference_code
  ),
  application.updated_at
from public.investment_applications as application
where not exists (
  select 1
  from public.application_audit_log as audit
  where audit.application_id = application.id
    and audit.action_type = 'baseline'
);


-- =========================================================
-- AUDITED APPLICATION REVIEW RPC
-- Only reviewers/admins can execute it.
-- Updates status only and optionally creates an internal note.
-- Existing notification triggers continue to run.
-- =========================================================

create or replace function public.review_application(
  p_application_id uuid,
  p_new_status text,
  p_note text default null
)
returns table (
  updated_application_id uuid,
  updated_status text,
  created_note_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_note text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_application_reviewer() then
    raise exception 'Authorized reviewer access required.'
      using errcode = '42501';
  end if;

  if p_new_status not in (
    'submitted',
    'under_review',
    'approved',
    'declined',
    'cancelled'
  ) then
    raise exception 'Invalid application status.'
      using errcode = '22023';
  end if;

  update public.investment_applications as application
  set status = p_new_status
  where application.id = p_application_id
  returning
    application.id,
    application.status
  into
    updated_application_id,
    updated_status;

  if updated_application_id is null then
    raise exception 'Application not found.'
      using errcode = 'P0002';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');

  if v_note is not null then
    if char_length(v_note) > 2000 then
      raise exception
        'Review note cannot exceed 2000 characters.'
        using errcode = '22023';
    end if;

    insert into public.application_review_notes (
      application_id,
      author_user_id,
      note
    )
    values (
      p_application_id,
      auth.uid(),
      v_note
    )
    returning id into created_note_id;
  end if;

  return next;
end;
$$;


-- =========================================================
-- STANDALONE INTERNAL NOTE RPC
-- Adds a note without requiring a status change.
-- =========================================================

create or replace function
public.add_application_review_note(
  p_application_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_note text;
  v_note_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_application_reviewer() then
    raise exception 'Authorized reviewer access required.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.investment_applications
    where id = p_application_id
  ) then
    raise exception 'Application not found.'
      using errcode = 'P0002';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');

  if v_note is null then
    raise exception 'Review note cannot be empty.'
      using errcode = '22023';
  end if;

  if char_length(v_note) > 2000 then
    raise exception
      'Review note cannot exceed 2000 characters.'
      using errcode = '22023';
  end if;

  insert into public.application_review_notes (
    application_id,
    author_user_id,
    note
  )
  values (
    p_application_id,
    auth.uid(),
    v_note
  )
  returning id into v_note_id;

  return v_note_id;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.review_application(uuid, text, text)
from public, anon;

revoke all
on function public.add_application_review_note(uuid, text)
from public, anon;

grant execute
on function public.review_application(uuid, text, text)
to authenticated;

grant execute
on function public.add_application_review_note(uuid, text)
to authenticated;


-- =========================================================
-- ZERO-DOWNTIME CUTOVER
-- Direct update access remains temporarily available while the
-- RPC-based application client is deployed. A follow-up migration
-- removes direct update access after production verification.
-- =========================================================

commit;
