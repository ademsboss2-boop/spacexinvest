begin;

-- All administrative status changes must now pass through
-- public.review_application(), which validates the reviewer,
-- limits writable fields, and generates audit records.

revoke update
on public.investment_applications
from authenticated;

drop policy if exists
  "applications_update_staff"
on public.investment_applications;

commit;
