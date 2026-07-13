begin;

-- =========================================================
-- MFA-VERIFIED APPLICATION REVIEWER
-- Staff membership alone is no longer sufficient.
-- The authenticated JWT must also contain aal = aal2.
-- =========================================================

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

revoke all
on function public.is_application_reviewer()
from public, anon;

grant execute
on function public.is_application_reviewer()
to authenticated;


-- =========================================================
-- MFA-VERIFIED ADMINISTRATOR
-- Staff-management operations now require an AAL2 session.
-- =========================================================

create or replace function public.is_staff_admin()
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
        and role = 'admin'
    );
$$;

revoke all
on function public.is_staff_admin()
from public, anon;

grant execute
on function public.is_staff_admin()
to authenticated;

commit;
