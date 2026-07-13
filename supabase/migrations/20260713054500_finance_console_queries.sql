begin;

-- =========================================================
-- FINANCE DEPOSIT QUEUE
-- Returns sandbox/testnet funding submissions with the
-- related investor, application, and opportunity information.
-- Requires an MFA-verified finance or administrator session.
-- =========================================================

create or replace function public.list_finance_deposits(
  p_status text default null,
  p_limit integer default 200
)
returns table (
  deposit_id uuid,
  application_id uuid,
  application_reference text,

  investor_user_id uuid,
  investor_email text,
  investor_display_name text,

  opportunity_title text,
  approved_target numeric,
  minimum_investment numeric,

  asset text,
  network text,
  wallet_address_snapshot text,
  asset_amount numeric,
  declared_usd_amount numeric,
  transaction_hash text,

  deposit_status text,
  credited_usd_amount numeric,

  investor_note text,
  finance_note text,

  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  v_status := nullif(
    btrim(coalesce(p_status, '')),
    ''
  );

  if v_status is not null
     and v_status not in (
       'pending_verification',
       'verified',
       'rejected'
     ) then
    raise exception 'Invalid deposit status filter.'
      using errcode = '22023';
  end if;

  v_limit := greatest(
    1,
    least(coalesce(p_limit, 200), 500)
  );

  return query
  select
    deposit.id,
    deposit.application_id,
    application.reference_code,

    deposit.investor_user_id,
    user_record.email::text,
    coalesce(
      nullif(btrim(profile.display_name), ''),
      split_part(user_record.email::text, '@', 1),
      'Investor'
    ),

    coalesce(
      opportunity.title,
      'Investment Opportunity'
    ),
    application.amount::numeric,
    coalesce(
      opportunity.minimum_investment,
      0
    )::numeric,

    deposit.asset,
    deposit.network,
    deposit.wallet_address_snapshot,
    deposit.asset_amount,
    deposit.declared_usd_amount,
    deposit.transaction_hash,

    deposit.status,
    deposit.credited_usd_amount,

    deposit.investor_note,
    deposit.finance_note,

    deposit.submitted_at,
    deposit.reviewed_at

  from public.investor_deposits as deposit

  join public.investment_applications as application
    on application.id = deposit.application_id

  left join public.opportunities as opportunity
    on opportunity.id = application.opportunity_id

  join auth.users as user_record
    on user_record.id = deposit.investor_user_id

  left join public.profiles as profile
    on profile.id = deposit.investor_user_id

  where (
    v_status is null
    or deposit.status = v_status
  )

  order by
    case deposit.status
      when 'pending_verification' then 0
      when 'verified' then 1
      else 2
    end,
    deposit.submitted_at desc

  limit v_limit;
end;
$$;

revoke all
on function public.list_finance_deposits(
  text,
  integer
)
from public, anon;

grant execute
on function public.list_finance_deposits(
  text,
  integer
)
to authenticated;

commit;
