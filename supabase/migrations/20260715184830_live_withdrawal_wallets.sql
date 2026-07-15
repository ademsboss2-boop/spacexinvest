begin;

alter table public.investor_withdrawal_requests
drop constraint if exists
  investor_withdrawal_requests_payout_network_check;

alter table public.investor_withdrawal_requests
drop constraint if exists withdrawal_asset_network_match;

alter table public.investor_withdrawal_requests
add constraint investor_withdrawal_requests_payout_network_check
check (
  payout_network in (
    'TRON_TESTNET_TRC20',
    'BITCOIN_TESTNET',
    'TRON_MAINNET_TRC20',
    'BITCOIN_MAINNET'
  )
);

alter table public.investor_withdrawal_requests
add constraint withdrawal_asset_network_match
check (
  (
    payout_asset = 'USDT'
    and payout_network in (
      'TRON_TESTNET_TRC20',
      'TRON_MAINNET_TRC20'
    )
  )
  or
  (
    payout_asset = 'BTC'
    and payout_network in (
      'BITCOIN_TESTNET',
      'BITCOIN_MAINNET'
    )
  )
);

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
    v_payout_network := 'TRON_MAINNET_TRC20';

    if v_wallet_address !~
      '^T[1-9A-HJ-NP-Za-km-z]{33}$'
    then
      raise exception
        'Enter a valid USDT TRC20 wallet address.'
        using errcode = '22023';
    end if;
  else
    v_payout_network := 'BITCOIN_MAINNET';

    if not (
      v_wallet_address ~
        '^[13][1-9A-HJ-NP-Za-km-z]{25,39}$'
      or (
        lower(v_wallet_address) ~
          '^bc1[ac-hj-np-z02-9]{11,87}$'
        and (
          v_wallet_address = lower(v_wallet_address)
          or v_wallet_address = upper(v_wallet_address)
        )
      )
    ) then
      raise exception
        'Enter a valid Bitcoin mainnet wallet address.'
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

commit;