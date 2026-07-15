begin;

-- =========================================================
-- INTERNAL WALLET MASKING
-- Used in the administrator review queue.
-- Finance receives the full address through a separate RPC.
-- =========================================================

create or replace function public.mask_withdrawal_wallet(
  p_wallet_address text
)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when p_wallet_address is null then
      'Unavailable'

    when char_length(p_wallet_address) < 14 then
      '••••••'

    else
      left(p_wallet_address, 6) ||
      '...' ||
      right(p_wallet_address, 6)
  end;
$$;

revoke all
on function public.mask_withdrawal_wallet(text)
from public, anon, authenticated;


-- =========================================================
-- INVESTOR WITHDRAWAL POSITION SUMMARY
-- Includes server-calculated balances and any open request.
-- =========================================================

create or replace function public.list_investor_withdrawal_positions()
returns table (
  position_id uuid,
  application_id uuid,
  application_reference text,
  opportunity_title text,
  portfolio_status text,

  remaining_capital numeric,
  available_profit numeric,

  has_open_request boolean,
  open_request_id uuid,
  open_request_reference text,
  open_request_type text,
  open_request_status text,
  open_request_created_at timestamp with time zone
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

  return query
  select
    position.id,
    position.application_id,
    application.reference_code,

    coalesce(
      opportunity.title,
      'Investment Opportunity'
    ),

    position.status,

    balance.remaining_capital,
    balance.available_profit,

    open_request.id is not null,
    open_request.id,
    open_request.request_reference,
    open_request.request_type,
    open_request.status,
    open_request.created_at

  from public.portfolio_positions as position

  join public.investment_applications as application
    on application.id = position.application_id

  left join public.opportunities as opportunity
    on opportunity.id = position.opportunity_id

  cross join lateral
    public.calculate_withdrawal_balances(
      position.id
    ) as balance

  left join lateral (
    select
      withdrawal.id,
      withdrawal.request_reference,
      withdrawal.request_type,
      withdrawal.status,
      withdrawal.created_at
    from public.investor_withdrawal_requests
      as withdrawal
    where withdrawal.position_id = position.id
      and withdrawal.status in (
        'submitted',
        'under_review',
        'approved',
        'processing'
      )
    order by withdrawal.created_at desc
    limit 1
  ) as open_request on true

  where position.investor_user_id = auth.uid()

  order by position.created_at desc;
end;
$$;


-- =========================================================
-- INVESTOR WITHDRAWAL HISTORY
-- Internal review and finance notes are never returned.
-- =========================================================

create or replace function public.list_investor_withdrawal_requests(
  p_limit integer default 100
)
returns table (
  request_id uuid,
  request_reference text,

  position_id uuid,
  application_id uuid,
  application_reference text,
  opportunity_title text,

  request_type text,
  payout_asset text,
  payout_network text,
  wallet_address text,

  requested_capital numeric,
  requested_profit numeric,
  requested_total numeric,

  approved_capital numeric,
  approved_profit numeric,
  approved_total numeric,

  status text,
  investor_note text,
  investor_message text,

  transaction_reference text,

  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  processing_started_at timestamp with time zone,
  completed_at timestamp with time zone
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

  v_limit := greatest(
    1,
    least(coalesce(p_limit, 100), 500)
  );

  return query
  select
    withdrawal.id,
    withdrawal.request_reference,

    withdrawal.position_id,
    withdrawal.application_id,
    application.reference_code,

    coalesce(
      opportunity.title,
      'Investment Opportunity'
    ),

    withdrawal.request_type,
    withdrawal.payout_asset,
    withdrawal.payout_network,
    withdrawal.wallet_address,

    withdrawal.requested_capital,
    withdrawal.requested_profit,
    withdrawal.requested_total,

    withdrawal.approved_capital,
    withdrawal.approved_profit,
    withdrawal.approved_total,

    withdrawal.status,
    withdrawal.investor_note,
    withdrawal.investor_message,

    case
      when withdrawal.status = 'completed' then
        withdrawal.transaction_reference
      else null
    end,

    withdrawal.created_at,
    withdrawal.updated_at,
    withdrawal.reviewed_at,
    withdrawal.processing_started_at,
    withdrawal.completed_at

  from public.investor_withdrawal_requests
    as withdrawal

  join public.investment_applications as application
    on application.id = withdrawal.application_id

  join public.portfolio_positions as position
    on position.id = withdrawal.position_id

  left join public.opportunities as opportunity
    on opportunity.id = position.opportunity_id

  where withdrawal.investor_user_id = auth.uid()

  order by withdrawal.created_at desc
  limit v_limit;
end;
$$;


-- =========================================================
-- ADMINISTRATOR REVIEW QUEUE
-- Wallet addresses are masked.
-- Approval remains administrator-only and MFA-protected.
-- =========================================================

create or replace function public.list_admin_withdrawal_requests(
  p_status text default null,
  p_limit integer default 200
)
returns table (
  request_id uuid,
  request_reference text,

  position_id uuid,
  application_id uuid,
  application_reference text,

  investor_user_id uuid,
  investor_email text,
  investor_display_name text,

  opportunity_title text,

  request_type text,
  payout_asset text,
  payout_network text,
  masked_wallet_address text,

  requested_capital numeric,
  requested_profit numeric,
  requested_total numeric,

  approved_capital numeric,
  approved_profit numeric,
  approved_total numeric,

  status text,
  investor_note text,
  investor_message text,
  review_note text,

  reviewed_by uuid,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone,
  updated_at timestamp with time zone
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

  if p_status is not null
     and p_status not in (
       'submitted',
       'under_review',
       'approved',
       'rejected',
       'processing',
       'completed',
       'cancelled'
     )
  then
    raise exception 'Invalid withdrawal status filter.'
      using errcode = '22023';
  end if;

  v_limit := greatest(
    1,
    least(coalesce(p_limit, 200), 500)
  );

  return query
  select
    withdrawal.id,
    withdrawal.request_reference,

    withdrawal.position_id,
    withdrawal.application_id,
    application.reference_code,

    withdrawal.investor_user_id,
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

    withdrawal.request_type,
    withdrawal.payout_asset,
    withdrawal.payout_network,

    public.mask_withdrawal_wallet(
      withdrawal.wallet_address
    ),

    withdrawal.requested_capital,
    withdrawal.requested_profit,
    withdrawal.requested_total,

    withdrawal.approved_capital,
    withdrawal.approved_profit,
    withdrawal.approved_total,

    withdrawal.status,
    withdrawal.investor_note,
    withdrawal.investor_message,
    withdrawal.review_note,

    withdrawal.reviewed_by,
    withdrawal.reviewed_at,

    withdrawal.created_at,
    withdrawal.updated_at

  from public.investor_withdrawal_requests
    as withdrawal

  join public.investment_applications as application
    on application.id = withdrawal.application_id

  join public.portfolio_positions as position
    on position.id = withdrawal.position_id

  join auth.users as user_record
    on user_record.id = withdrawal.investor_user_id

  left join public.profiles as profile
    on profile.id = withdrawal.investor_user_id

  left join public.opportunities as opportunity
    on opportunity.id = position.opportunity_id

  where (
    p_status is null
    or withdrawal.status = p_status
  )

  order by
    case withdrawal.status
      when 'submitted' then 0
      when 'under_review' then 1
      when 'approved' then 2
      when 'processing' then 3
      else 4
    end,
    withdrawal.created_at asc

  limit v_limit;
end;
$$;


-- =========================================================
-- FINANCE PROCESSING QUEUE
-- Only approved, processing, and completed requests appear.
-- Finance receives the complete wallet address.
-- =========================================================

create or replace function public.list_finance_withdrawal_requests(
  p_status text default null,
  p_limit integer default 200
)
returns table (
  request_id uuid,
  request_reference text,

  position_id uuid,
  application_id uuid,
  application_reference text,

  investor_user_id uuid,
  investor_email text,
  investor_display_name text,

  opportunity_title text,

  request_type text,
  payout_asset text,
  payout_network text,
  wallet_address text,

  requested_capital numeric,
  requested_profit numeric,
  requested_total numeric,

  approved_capital numeric,
  approved_profit numeric,
  approved_total numeric,

  status text,
  investor_note text,
  finance_note text,
  transaction_reference text,

  reviewed_at timestamp with time zone,
  processing_started_at timestamp with time zone,
  completed_at timestamp with time zone,

  created_at timestamp with time zone,
  updated_at timestamp with time zone
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

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  if p_status is not null
     and p_status not in (
       'approved',
       'processing',
       'completed'
     )
  then
    raise exception
      'Finance can only access approved, processing, or completed withdrawals.'
      using errcode = '22023';
  end if;

  v_limit := greatest(
    1,
    least(coalesce(p_limit, 200), 500)
  );

  return query
  select
    withdrawal.id,
    withdrawal.request_reference,

    withdrawal.position_id,
    withdrawal.application_id,
    application.reference_code,

    withdrawal.investor_user_id,
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

    withdrawal.request_type,
    withdrawal.payout_asset,
    withdrawal.payout_network,
    withdrawal.wallet_address,

    withdrawal.requested_capital,
    withdrawal.requested_profit,
    withdrawal.requested_total,

    withdrawal.approved_capital,
    withdrawal.approved_profit,
    withdrawal.approved_total,

    withdrawal.status,
    withdrawal.investor_note,
    withdrawal.finance_note,
    withdrawal.transaction_reference,

    withdrawal.reviewed_at,
    withdrawal.processing_started_at,
    withdrawal.completed_at,

    withdrawal.created_at,
    withdrawal.updated_at

  from public.investor_withdrawal_requests
    as withdrawal

  join public.investment_applications as application
    on application.id = withdrawal.application_id

  join public.portfolio_positions as position
    on position.id = withdrawal.position_id

  join auth.users as user_record
    on user_record.id = withdrawal.investor_user_id

  left join public.profiles as profile
    on profile.id = withdrawal.investor_user_id

  left join public.opportunities as opportunity
    on opportunity.id = position.opportunity_id

  where withdrawal.status in (
    'approved',
    'processing',
    'completed'
  )
  and (
    p_status is null
    or withdrawal.status = p_status
  )

  order by
    case withdrawal.status
      when 'approved' then 0
      when 'processing' then 1
      else 2
    end,
    coalesce(
      withdrawal.reviewed_at,
      withdrawal.created_at
    ) asc

  limit v_limit;
end;
$$;


-- =========================================================
-- FINANCE PROFIT-CREDIT HISTORY
-- =========================================================

create or replace function public.list_finance_profit_credits(
  p_position_id uuid default null,
  p_limit integer default 200
)
returns table (
  credit_id uuid,
  credit_reference text,

  position_id uuid,
  application_id uuid,
  application_reference text,

  investor_user_id uuid,
  investor_email text,
  investor_display_name text,

  opportunity_title text,

  amount numeric,
  effective_date date,
  finance_note text,

  created_by uuid,
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

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  v_limit := greatest(
    1,
    least(coalesce(p_limit, 200), 500)
  );

  return query
  select
    credit.id,
    credit.credit_reference,

    credit.position_id,
    credit.application_id,
    application.reference_code,

    credit.investor_user_id,
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

    credit.amount,
    credit.effective_date,
    credit.finance_note,

    credit.created_by,
    credit.created_at

  from public.portfolio_profit_credits as credit

  join public.investment_applications as application
    on application.id = credit.application_id

  join public.portfolio_positions as position
    on position.id = credit.position_id

  join auth.users as user_record
    on user_record.id = credit.investor_user_id

  left join public.profiles as profile
    on profile.id = credit.investor_user_id

  left join public.opportunities as opportunity
    on opportunity.id = position.opportunity_id

  where (
    p_position_id is null
    or credit.position_id = p_position_id
  )

  order by
    credit.effective_date desc,
    credit.created_at desc

  limit v_limit;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.list_investor_withdrawal_positions()
from public, anon;

revoke all
on function public.list_investor_withdrawal_requests(integer)
from public, anon;

revoke all
on function public.list_admin_withdrawal_requests(
  text,
  integer
)
from public, anon;

revoke all
on function public.list_finance_withdrawal_requests(
  text,
  integer
)
from public, anon;

revoke all
on function public.list_finance_profit_credits(
  uuid,
  integer
)
from public, anon;


grant execute
on function public.list_investor_withdrawal_positions()
to authenticated;

grant execute
on function public.list_investor_withdrawal_requests(integer)
to authenticated;

grant execute
on function public.list_admin_withdrawal_requests(
  text,
  integer
)
to authenticated;

grant execute
on function public.list_finance_withdrawal_requests(
  text,
  integer
)
to authenticated;

grant execute
on function public.list_finance_profit_credits(
  uuid,
  integer
)
to authenticated;

commit;