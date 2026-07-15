begin;

-- =========================================================
-- INTERNAL WITHDRAWAL BALANCE CALCULATION
-- Remaining capital:
--   verified funded capital - returned capital
--
-- Available profit:
--   immutable profit credits - completed profit withdrawals
-- =========================================================

create or replace function public.calculate_withdrawal_balances(
  p_position_id uuid
)
returns table (
  remaining_capital numeric,
  available_profit numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with position_data as (
    select
      position.id,
      position.application_id
    from public.portfolio_positions as position
    where position.id = p_position_id
  ),

  funded as (
    select coalesce(
      sum(deposit.credited_usd_amount),
      0
    )::numeric as total
    from position_data
    left join public.investor_deposits as deposit
      on deposit.application_id =
        position_data.application_id
      and deposit.status = 'verified'
  ),

  returned as (
    select coalesce(
      sum(distribution.amount),
      0
    )::numeric as total
    from position_data
    left join public.portfolio_distributions
      as distribution
      on distribution.position_id =
        position_data.id
      and distribution.distribution_type =
        'return_of_capital'
  ),

  credited_profit as (
    select coalesce(
      sum(credit.amount),
      0
    )::numeric as total
    from position_data
    left join public.portfolio_profit_credits
      as credit
      on credit.position_id =
        position_data.id
  ),

  completed_profit as (
    select coalesce(
      sum(withdrawal.approved_profit),
      0
    )::numeric as total
    from position_data
    left join public.investor_withdrawal_requests
      as withdrawal
      on withdrawal.position_id =
        position_data.id
      and withdrawal.status = 'completed'
  )

  select
    round(
      greatest(
        funded.total - returned.total,
        0
      ),
      2
    ) as remaining_capital,

    round(
      greatest(
        credited_profit.total -
        completed_profit.total,
        0
      ),
      2
    ) as available_profit

  from position_data
  cross join funded
  cross join returned
  cross join credited_profit
  cross join completed_profit;
$$;

revoke all
on function public.calculate_withdrawal_balances(uuid)
from public, anon, authenticated;


-- =========================================================
-- FINANCE: RECORD WITHDRAWABLE PROFIT
-- Profit credits are separate from distributions already
-- paid to an investor.
-- =========================================================

create or replace function public.record_portfolio_profit_credit(
  p_position_id uuid,
  p_amount numeric,
  p_effective_date date,
  p_finance_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application_id uuid;
  v_investor_user_id uuid;
  v_position_status text;
  v_credit_id uuid;
  v_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  v_amount := round(coalesce(p_amount, 0), 2);

  if v_amount <= 0 then
    raise exception
      'The profit credit amount must be greater than zero.'
      using errcode = '22023';
  end if;

  if p_effective_date is null then
    raise exception 'An effective date is required.'
      using errcode = '22023';
  end if;

  if p_effective_date > current_date then
    raise exception
      'Profit credits cannot use a future effective date.'
      using errcode = '22023';
  end if;

  select
    position.application_id,
    position.investor_user_id,
    position.status
  into
    v_application_id,
    v_investor_user_id,
    v_position_status
  from public.portfolio_positions as position
  where position.id = p_position_id
  for update;

  if not found then
    raise exception 'Portfolio position not found.'
      using errcode = 'P0002';
  end if;

  if v_position_status <> 'active' then
    raise exception
      'Profit can only be credited to an active portfolio.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.investor_withdrawal_requests
      as withdrawal
    where withdrawal.position_id = p_position_id
      and withdrawal.request_type = 'full_exit'
      and withdrawal.status in (
        'submitted',
        'under_review',
        'approved',
        'processing'
      )
  ) then
    raise exception
      'Profit cannot be credited while a full-exit request is open.'
      using errcode = '22023';
  end if;

  insert into public.portfolio_profit_credits (
    position_id,
    application_id,
    investor_user_id,
    amount,
    effective_date,
    finance_note,
    created_by
  )
  values (
    p_position_id,
    v_application_id,
    v_investor_user_id,
    v_amount,
    p_effective_date,
    nullif(btrim(coalesce(p_finance_note, '')), ''),
    auth.uid()
  )
  returning id into v_credit_id;

  return v_credit_id;
end;
$$;


-- =========================================================
-- INVESTOR: SUBMIT WITHDRAWAL REQUEST
-- The database calculates all available amounts.
-- =========================================================

create or replace function public.submit_investor_withdrawal(
  p_position_id uuid,
  p_request_type text,
  p_payout_asset text,
  p_wallet_address text,
  p_profit_amount numeric default null,
  p_investor_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application_id uuid;
  v_investor_user_id uuid;
  v_position_status text;

  v_remaining_capital numeric;
  v_available_profit numeric;

  v_requested_capital numeric := 0;
  v_requested_profit numeric := 0;

  v_payout_network text;
  v_wallet_address text;

  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if p_request_type not in (
    'realized_profit',
    'full_exit'
  ) then
    raise exception 'Invalid withdrawal type.'
      using errcode = '22023';
  end if;

  if p_payout_asset not in ('USDT', 'BTC') then
    raise exception 'Invalid payout asset.'
      using errcode = '22023';
  end if;

  v_wallet_address :=
    btrim(coalesce(p_wallet_address, ''));

  if v_wallet_address = '' then
    raise exception 'A wallet address is required.'
      using errcode = '22023';
  end if;

  if v_wallet_address ~ '[[:space:]]' then
    raise exception
      'The wallet address cannot contain spaces.'
      using errcode = '22023';
  end if;

  if p_payout_asset = 'USDT' then
    v_payout_network := 'TRON_TESTNET_TRC20';

    if v_wallet_address !~
      '^T[1-9A-HJ-NP-Za-km-z]{33}$'
    then
      raise exception
        'Enter a valid TRC20 testnet wallet address.'
        using errcode = '22023';
    end if;
  else
    v_payout_network := 'BITCOIN_TESTNET';

    if not (
      v_wallet_address ~
        '^[mn2][1-9A-HJ-NP-Za-km-z]{25,39}$'
      or
      v_wallet_address ~*
        '^tb1[ac-hj-np-z02-9]{11,87}$'
    ) then
      raise exception
        'Enter a valid Bitcoin testnet wallet address.'
        using errcode = '22023';
    end if;
  end if;

  select
    position.application_id,
    position.investor_user_id,
    position.status
  into
    v_application_id,
    v_investor_user_id,
    v_position_status
  from public.portfolio_positions as position
  where position.id = p_position_id
    and position.investor_user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Portfolio position not found.'
      using errcode = 'P0002';
  end if;

  if v_position_status <> 'active' then
    raise exception
      'Withdrawals are only available for active portfolios.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.investor_withdrawal_requests
      as withdrawal
    where withdrawal.position_id = p_position_id
      and withdrawal.status in (
        'submitted',
        'under_review',
        'approved',
        'processing'
      )
  ) then
    raise exception
      'This portfolio already has an open withdrawal request.'
      using errcode = '23505';
  end if;

  select
    balance.remaining_capital,
    balance.available_profit
  into
    v_remaining_capital,
    v_available_profit
  from public.calculate_withdrawal_balances(
    p_position_id
  ) as balance;

  if p_request_type = 'realized_profit' then
    if v_available_profit <= 0 then
      raise exception
        'No realized profit is currently available for withdrawal.'
        using errcode = '22023';
    end if;

    v_requested_profit := round(
      coalesce(
        p_profit_amount,
        v_available_profit
      ),
      2
    );

    if v_requested_profit <= 0 then
      raise exception
        'The requested profit amount must be greater than zero.'
        using errcode = '22023';
    end if;

    if v_requested_profit > v_available_profit then
      raise exception
        'The requested amount exceeds the available realized profit.'
        using errcode = '22023';
    end if;

    v_requested_capital := 0;
  else
    if p_profit_amount is not null then
      raise exception
        'A full-exit request automatically includes all available profit.'
        using errcode = '22023';
    end if;

    v_requested_capital :=
      v_remaining_capital;

    v_requested_profit :=
      v_available_profit;

    if (
      v_requested_capital +
      v_requested_profit
    ) <= 0 then
      raise exception
        'No capital or realized profit is currently available.'
        using errcode = '22023';
    end if;
  end if;

  insert into public.investor_withdrawal_requests (
    position_id,
    application_id,
    investor_user_id,
    request_type,
    payout_asset,
    payout_network,
    wallet_address,
    requested_capital,
    requested_profit,
    investor_note
  )
  values (
    p_position_id,
    v_application_id,
    v_investor_user_id,
    p_request_type,
    p_payout_asset,
    v_payout_network,
    v_wallet_address,
    v_requested_capital,
    v_requested_profit,
    nullif(btrim(coalesce(p_investor_note, '')), '')
  )
  returning id into v_request_id;

  insert into public.withdrawal_audit_log (
    withdrawal_request_id,
    position_id,
    application_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status,
    metadata
  )
  values (
    v_request_id,
    p_position_id,
    v_application_id,
    auth.uid(),
    'request_submitted',
    null,
    'submitted',
    jsonb_build_object(
      'request_type',
      p_request_type,
      'payout_asset',
      p_payout_asset,
      'requested_capital',
      v_requested_capital,
      'requested_profit',
      v_requested_profit
    )
  );

  return v_request_id;
end;
$$;


-- =========================================================
-- INVESTOR: CANCEL AN UNREVIEWED REQUEST
-- =========================================================

create or replace function public.cancel_investor_withdrawal(
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_position_id uuid;
  v_application_id uuid;
  v_previous_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  select
    withdrawal.position_id,
    withdrawal.application_id,
    withdrawal.status
  into
    v_position_id,
    v_application_id,
    v_previous_status
  from public.investor_withdrawal_requests
    as withdrawal
  where withdrawal.id = p_request_id
    and withdrawal.investor_user_id =
      auth.uid()
  for update;

  if not found then
    raise exception 'Withdrawal request not found.'
      using errcode = 'P0002';
  end if;

  if v_previous_status <> 'submitted' then
    raise exception
      'Only a submitted request can be cancelled.'
      using errcode = '22023';
  end if;

  update public.investor_withdrawal_requests
  set
    status = 'cancelled',
    updated_at = now()
  where id = p_request_id;

  insert into public.withdrawal_audit_log (
    withdrawal_request_id,
    position_id,
    application_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status
  )
  values (
    p_request_id,
    v_position_id,
    v_application_id,
    auth.uid(),
    'request_cancelled',
    v_previous_status,
    'cancelled'
  );

  return true;
end;
$$;


-- =========================================================
-- REVIEWER / ADMIN: REVIEW REQUEST
-- Decisions:
--   under_review
--   approved
--   rejected
-- =========================================================

create or replace function public.review_investor_withdrawal(
  p_request_id uuid,
  p_decision text,
  p_investor_message text default null,
  p_review_note text default null,
  p_approved_capital numeric default null,
  p_approved_profit numeric default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_position_id uuid;
  v_application_id uuid;
  v_request_type text;
  v_previous_status text;

  v_requested_capital numeric;
  v_requested_profit numeric;

  v_remaining_capital numeric;
  v_available_profit numeric;

  v_approved_capital numeric;
  v_approved_profit numeric;

  v_event_type text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_staff_admin() then
    raise exception
      'Administrator access required.'
      using errcode = '42501';
  end if;

  if p_decision not in (
    'under_review',
    'approved',
    'rejected'
  ) then
    raise exception 'Invalid review decision.'
      using errcode = '22023';
  end if;

  select
    withdrawal.position_id,
    withdrawal.application_id,
    withdrawal.request_type,
    withdrawal.status,
    withdrawal.requested_capital,
    withdrawal.requested_profit
  into
    v_position_id,
    v_application_id,
    v_request_type,
    v_previous_status,
    v_requested_capital,
    v_requested_profit
  from public.investor_withdrawal_requests
    as withdrawal
  where withdrawal.id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.'
      using errcode = 'P0002';
  end if;

  if v_previous_status not in (
    'submitted',
    'under_review'
  ) then
    raise exception
      'This withdrawal request can no longer be reviewed.'
      using errcode = '22023';
  end if;

  if p_decision = 'under_review' then
    update public.investor_withdrawal_requests
    set
      status = 'under_review',
      investor_message =
        nullif(
          btrim(coalesce(p_investor_message, '')),
          ''
        ),
      review_note =
        nullif(
          btrim(coalesce(p_review_note, '')),
          ''
        ),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    v_event_type := 'review_started';

  elsif p_decision = 'rejected' then
    if nullif(
      btrim(coalesce(p_investor_message, '')),
      ''
    ) is null then
      raise exception
        'An investor-facing explanation is required when rejecting a request.'
        using errcode = '22023';
    end if;

    update public.investor_withdrawal_requests
    set
      status = 'rejected',
      approved_capital = null,
      approved_profit = null,
      investor_message =
        btrim(p_investor_message),
      review_note =
        nullif(
          btrim(coalesce(p_review_note, '')),
          ''
        ),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    v_event_type := 'request_rejected';

  else
    select
      balance.remaining_capital,
      balance.available_profit
    into
      v_remaining_capital,
      v_available_profit
    from public.calculate_withdrawal_balances(
      v_position_id
    ) as balance;

    if v_request_type = 'full_exit' then
      if p_approved_capital is not null
         and round(p_approved_capital, 2) <>
           v_requested_capital
      then
        raise exception
          'A full exit must include all requested capital.'
          using errcode = '22023';
      end if;

      if p_approved_profit is not null
         and round(p_approved_profit, 2) <>
           v_requested_profit
      then
        raise exception
          'A full exit must include all requested profit.'
          using errcode = '22023';
      end if;

      if v_requested_capital <>
           v_remaining_capital
         or v_requested_profit <>
           v_available_profit
      then
        raise exception
          'The portfolio balance changed after this full-exit request was submitted. Reject it and request a new submission.'
          using errcode = '22023';
      end if;

      v_approved_capital :=
        v_requested_capital;

      v_approved_profit :=
        v_requested_profit;
    else
      if p_approved_capital is not null
         and round(p_approved_capital, 2) <> 0
      then
        raise exception
          'A realized-profit withdrawal cannot include capital.'
          using errcode = '22023';
      end if;

      v_approved_capital := 0;

      v_approved_profit := round(
        coalesce(
          p_approved_profit,
          v_requested_profit
        ),
        2
      );

      if v_approved_profit <= 0 then
        raise exception
          'The approved profit must be greater than zero.'
          using errcode = '22023';
      end if;

      if v_approved_profit >
        v_requested_profit
      then
        raise exception
          'Approved profit cannot exceed the requested amount.'
          using errcode = '22023';
      end if;
    end if;

    if v_approved_capital >
      v_remaining_capital
    then
      raise exception
        'Available capital has changed since this request was submitted.'
        using errcode = '22023';
    end if;

    if v_approved_profit >
      v_available_profit
    then
      raise exception
        'Available realized profit has changed since this request was submitted.'
        using errcode = '22023';
    end if;

    update public.investor_withdrawal_requests
    set
      status = 'approved',
      approved_capital =
        v_approved_capital,
      approved_profit =
        v_approved_profit,
      investor_message =
        nullif(
          btrim(coalesce(p_investor_message, '')),
          ''
        ),
      review_note =
        nullif(
          btrim(coalesce(p_review_note, '')),
          ''
        ),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    v_event_type := 'request_approved';
  end if;

  insert into public.withdrawal_audit_log (
    withdrawal_request_id,
    position_id,
    application_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status,
    metadata
  )
  values (
    p_request_id,
    v_position_id,
    v_application_id,
    auth.uid(),
    v_event_type,
    v_previous_status,
    p_decision,
    case
      when p_decision = 'approved' then
        jsonb_build_object(
          'approved_capital',
          v_approved_capital,
          'approved_profit',
          v_approved_profit
        )
      else '{}'::jsonb
    end
  );

  return p_decision;
end;
$$;


-- =========================================================
-- FINANCE: MARK APPROVED REQUEST AS PROCESSING
-- =========================================================

create or replace function public.mark_withdrawal_processing(
  p_request_id uuid,
  p_finance_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_position_id uuid;
  v_application_id uuid;
  v_previous_status text;
  v_reviewed_by uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  select
    withdrawal.position_id,
    withdrawal.application_id,
    withdrawal.status,
    withdrawal.reviewed_by
  into
    v_position_id,
    v_application_id,
    v_previous_status,
    v_reviewed_by
  from public.investor_withdrawal_requests
    as withdrawal
  where withdrawal.id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.'
      using errcode = 'P0002';
  end if;

  if v_previous_status <> 'approved' then
    raise exception
      'Only an approved withdrawal can begin processing.'
      using errcode = '22023';
  end if;

  if v_reviewed_by is null then
    raise exception
      'The withdrawal does not contain a valid approval record.'
      using errcode = '22023';
  end if;

  if v_reviewed_by = auth.uid() then
    raise exception
      'The approving administrator cannot process the same withdrawal.'
      using errcode = '42501';
  end if;

  update public.investor_withdrawal_requests
  set
    status = 'processing',
    finance_note =
      nullif(
        btrim(coalesce(p_finance_note, '')),
        ''
      ),
    processed_by = auth.uid(),
    processing_started_at = now(),
    updated_at = now()
  where id = p_request_id;

  insert into public.withdrawal_audit_log (
    withdrawal_request_id,
    position_id,
    application_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status
  )
  values (
    p_request_id,
    v_position_id,
    v_application_id,
    auth.uid(),
    'processing_started',
    v_previous_status,
    'processing'
  );

  return true;
end;
$$;


-- =========================================================
-- FINANCE: COMPLETE MANUALLY PROCESSED WITHDRAWAL
-- This records accounting distributions after finance has
-- separately processed the approved testnet transaction.
-- =========================================================

create or replace function public.complete_investor_withdrawal(
  p_request_id uuid,
  p_transaction_reference text,
  p_finance_note text default null,
  p_effective_date date default current_date
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_position_id uuid;
  v_application_id uuid;
  v_request_reference text;
  v_request_type text;
  v_previous_status text;
  v_reviewed_by uuid;

  v_approved_capital numeric;
  v_approved_profit numeric;

  v_remaining_capital numeric;
  v_available_profit numeric;

  v_transaction_reference text;
  v_distribution_note text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  v_transaction_reference :=
    btrim(
      coalesce(
        p_transaction_reference,
        ''
      )
    );

  if char_length(v_transaction_reference)
    < 6
  then
    raise exception
      'A valid transaction reference is required.'
      using errcode = '22023';
  end if;

  if p_effective_date is null then
    raise exception 'An effective date is required.'
      using errcode = '22023';
  end if;

  if p_effective_date > current_date then
    raise exception
      'The completion date cannot be in the future.'
      using errcode = '22023';
  end if;

  select
    withdrawal.position_id,
    withdrawal.application_id,
    withdrawal.request_reference,
    withdrawal.request_type,
    withdrawal.status,
    withdrawal.reviewed_by,
    withdrawal.approved_capital,
    withdrawal.approved_profit
  into
    v_position_id,
    v_application_id,
    v_request_reference,
    v_request_type,
    v_previous_status,
    v_reviewed_by,
    v_approved_capital,
    v_approved_profit
  from public.investor_withdrawal_requests
    as withdrawal
  where withdrawal.id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.'
      using errcode = 'P0002';
  end if;

  if v_previous_status <> 'processing' then
    raise exception
      'Only a processing withdrawal can be completed.'
      using errcode = '22023';
  end if;

  if v_reviewed_by is null then
    raise exception
      'The withdrawal does not contain a valid approval record.'
      using errcode = '22023';
  end if;

  if v_reviewed_by = auth.uid() then
    raise exception
      'The approving administrator cannot complete the same withdrawal.'
      using errcode = '42501';
  end if;

  perform 1
  from public.portfolio_positions as position
  where position.id = v_position_id
  for update;

  select
    balance.remaining_capital,
    balance.available_profit
  into
    v_remaining_capital,
    v_available_profit
  from public.calculate_withdrawal_balances(
    v_position_id
  ) as balance;

  if v_request_type = 'full_exit'
     and (
       coalesce(v_approved_capital, 0) <>
         v_remaining_capital
       or
       coalesce(v_approved_profit, 0) <>
         v_available_profit
     )
  then
    raise exception
      'The portfolio balance changed before full-exit completion. The request must be reviewed again.'
      using errcode = '22023';
  end if;

  if coalesce(v_approved_capital, 0) >
    v_remaining_capital
  then
    raise exception
      'The available capital changed before completion.'
      using errcode = '22023';
  end if;

  if coalesce(v_approved_profit, 0) >
    v_available_profit
  then
    raise exception
      'The available realized profit changed before completion.'
      using errcode = '22023';
  end if;

  v_distribution_note :=
    'Completed withdrawal request ' ||
    v_request_reference || '.';

  if coalesce(v_approved_profit, 0) > 0 then
    perform public.record_portfolio_distribution(
      v_application_id,
      'realized_profit',
      v_approved_profit,
      p_effective_date,
      v_distribution_note
    );
  end if;

  if coalesce(v_approved_capital, 0) > 0 then
    perform public.record_portfolio_distribution(
      v_application_id,
      'return_of_capital',
      v_approved_capital,
      p_effective_date,
      v_distribution_note
    );
  end if;

  if v_request_type = 'full_exit' then
    perform public.set_portfolio_status(
      v_application_id,
      'closed'
    );
  end if;

  update public.investor_withdrawal_requests
  set
    status = 'completed',
    transaction_reference =
      v_transaction_reference,
    finance_note =
      coalesce(
        nullif(
          btrim(coalesce(p_finance_note, '')),
          ''
        ),
        finance_note
      ),
    processed_by = auth.uid(),
    completed_at = now(),
    updated_at = now()
  where id = p_request_id;

  insert into public.withdrawal_audit_log (
    withdrawal_request_id,
    position_id,
    application_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status,
    metadata
  )
  values (
    p_request_id,
    v_position_id,
    v_application_id,
    auth.uid(),
    'request_completed',
    v_previous_status,
    'completed',
    jsonb_build_object(
      'request_type',
      v_request_type,
      'completed_capital',
      coalesce(v_approved_capital, 0),
      'completed_profit',
      coalesce(v_approved_profit, 0)
    )
  );

  return true;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- Each function performs its own ownership, role and MFA
-- checks before reading or changing data.
-- =========================================================

revoke all
on function public.record_portfolio_profit_credit(
  uuid,
  numeric,
  date,
  text
)
from public, anon;

revoke all
on function public.submit_investor_withdrawal(
  uuid,
  text,
  text,
  text,
  numeric,
  text
)
from public, anon;

revoke all
on function public.cancel_investor_withdrawal(uuid)
from public, anon;

revoke all
on function public.review_investor_withdrawal(
  uuid,
  text,
  text,
  text,
  numeric,
  numeric
)
from public, anon;

revoke all
on function public.mark_withdrawal_processing(
  uuid,
  text
)
from public, anon;

revoke all
on function public.complete_investor_withdrawal(
  uuid,
  text,
  text,
  date
)
from public, anon;


grant execute
on function public.record_portfolio_profit_credit(
  uuid,
  numeric,
  date,
  text
)
to authenticated;

grant execute
on function public.submit_investor_withdrawal(
  uuid,
  text,
  text,
  text,
  numeric,
  text
)
to authenticated;

grant execute
on function public.cancel_investor_withdrawal(uuid)
to authenticated;

grant execute
on function public.review_investor_withdrawal(
  uuid,
  text,
  text,
  text,
  numeric,
  numeric
)
to authenticated;

grant execute
on function public.mark_withdrawal_processing(
  uuid,
  text
)
to authenticated;

grant execute
on function public.complete_investor_withdrawal(
  uuid,
  text,
  text,
  date
)
to authenticated;

commit;