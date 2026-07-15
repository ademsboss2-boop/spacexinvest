begin;

-- =========================================================
-- WITHDRAWABLE REALIZED-PROFIT CREDITS
-- Finance records profit that is genuinely available for
-- withdrawal. These records are immutable.
-- =========================================================


create table public.portfolio_profit_credits (
  id uuid primary key default gen_random_uuid(),

  credit_reference text not null unique
    default (
      'PRF-' ||
      upper(
        substr(
          replace(gen_random_uuid()::text, '-', ''),
          1,
          12
        )
      )
    ),

  position_id uuid not null
    references public.portfolio_positions(id)
    on delete restrict,

  application_id uuid not null
    references public.investment_applications(id)
    on delete restrict,

  investor_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  amount numeric(18, 2) not null
    check (amount > 0),

  effective_date date not null,

  finance_note text
    check (
      finance_note is null
      or char_length(finance_note) <= 2000
    ),

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamp with time zone
    not null default now()
);

create index portfolio_profit_credits_position_idx
on public.portfolio_profit_credits (
  position_id,
  effective_date desc,
  created_at desc
);

create index portfolio_profit_credits_investor_idx
on public.portfolio_profit_credits (
  investor_user_id,
  created_at desc
);


-- =========================================================
-- INVESTOR WITHDRAWAL REQUESTS
-- Supported investor-facing payout options:
--   USDT (TRC20)
--   BTC
--
-- The internal environment remains testnet-only.
-- No private keys, seed phrases, or signing data are stored.
-- =========================================================

create table public.investor_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),

  request_reference text not null unique
    default (
      'WDR-' ||
      upper(
        substr(
          replace(gen_random_uuid()::text, '-', ''),
          1,
          12
        )
      )
    ),

  position_id uuid not null
    references public.portfolio_positions(id)
    on delete restrict,

  application_id uuid not null
    references public.investment_applications(id)
    on delete restrict,

  investor_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  request_type text not null
    check (
      request_type in (
        'realized_profit',
        'full_exit'
      )
    ),

  payout_asset text not null
    check (
      payout_asset in (
        'USDT',
        'BTC'
      )
    ),

  payout_network text not null
    check (
      payout_network in (
        'TRON_TESTNET_TRC20',
        'BITCOIN_TESTNET'
      )
    ),

  wallet_address text not null
    check (
      char_length(wallet_address)
        between 20 and 128
    )
    check (
      wallet_address = btrim(wallet_address)
    )
    check (
      wallet_address !~ '[[:space:]]'
    ),

  requested_capital numeric(18, 2)
    not null default 0
    check (requested_capital >= 0),

  requested_profit numeric(18, 2)
    not null default 0
    check (requested_profit >= 0),

  requested_total numeric(18, 2)
    generated always as (
      requested_capital + requested_profit
    ) stored,

  approved_capital numeric(18, 2)
    check (
      approved_capital is null
      or approved_capital >= 0
    ),

  approved_profit numeric(18, 2)
    check (
      approved_profit is null
      or approved_profit >= 0
    ),

  approved_total numeric(18, 2)
    generated always as (
      coalesce(approved_capital, 0) +
      coalesce(approved_profit, 0)
    ) stored,

  status text not null default 'submitted'
    check (
      status in (
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'processing',
        'completed',
        'cancelled'
      )
    ),

  investor_note text
    check (
      investor_note is null
      or char_length(investor_note) <= 1000
    ),

  investor_message text
    check (
      investor_message is null
      or char_length(investor_message) <= 1000
    ),

  review_note text
    check (
      review_note is null
      or char_length(review_note) <= 2000
    ),

  finance_note text
    check (
      finance_note is null
      or char_length(finance_note) <= 2000
    ),

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamp with time zone,

  processed_by uuid
    references auth.users(id)
    on delete set null,

  processing_started_at timestamp with time zone,

  completed_at timestamp with time zone,

  transaction_reference text
    check (
      transaction_reference is null
      or char_length(transaction_reference)
        between 6 and 200
    ),

  created_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now(),

  constraint withdrawal_requested_amount_positive
    check (
      requested_capital + requested_profit > 0
    ),

  constraint withdrawal_profit_type_amounts
    check (
      request_type <> 'realized_profit'
      or (
        requested_capital = 0
        and requested_profit > 0
      )
    ),

  constraint withdrawal_asset_network_match
    check (
      (
        payout_asset = 'USDT'
        and payout_network =
          'TRON_TESTNET_TRC20'
      )
      or
      (
        payout_asset = 'BTC'
        and payout_network =
          'BITCOIN_TESTNET'
      )
    ),

  constraint withdrawal_approved_not_above_requested
    check (
      (
        approved_capital is null
        or approved_capital <= requested_capital
      )
      and
      (
        approved_profit is null
        or approved_profit <= requested_profit
      )
    ),

  constraint withdrawal_approved_status_amounts
    check (
      status not in (
        'approved',
        'processing',
        'completed'
      )
      or (
        approved_capital is not null
        and approved_profit is not null
        and (
          approved_capital +
          approved_profit
        ) > 0
      )
    ),

  constraint withdrawal_profit_approval_capital
    check (
      request_type <> 'realized_profit'
      or approved_capital is null
      or approved_capital = 0
    )
);

create index withdrawal_requests_investor_idx
on public.investor_withdrawal_requests (
  investor_user_id,
  created_at desc
);

create index withdrawal_requests_review_queue_idx
on public.investor_withdrawal_requests (
  status,
  created_at asc
);

create index withdrawal_requests_finance_queue_idx
on public.investor_withdrawal_requests (
  status,
  reviewed_at asc
);

create index withdrawal_requests_position_idx
on public.investor_withdrawal_requests (
  position_id,
  created_at desc
);

create unique index withdrawal_requests_transaction_reference_unique_idx
on public.investor_withdrawal_requests (
  transaction_reference
)
where transaction_reference is not null;

create unique index withdrawal_requests_one_open_position_idx
on public.investor_withdrawal_requests (
  position_id
)
where status in (
  'submitted',
  'under_review',
  'approved',
  'processing'
);


-- =========================================================
-- IMMUTABLE WITHDRAWAL AUDIT LOG
-- Wallet addresses and transaction references must never be
-- copied into the metadata field.
-- =========================================================

create table public.withdrawal_audit_log (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null
    references public.investor_withdrawal_requests(id)
    on delete restrict,

  position_id uuid not null
    references public.portfolio_positions(id)
    on delete restrict,

  application_id uuid not null
    references public.investment_applications(id)
    on delete restrict,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  event_type text not null
    check (
      event_type in (
        'request_submitted',
        'review_started',
        'request_approved',
        'request_rejected',
        'processing_started',
        'request_completed',
        'request_cancelled'
      )
    ),

  previous_status text,

  new_status text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone
    not null default now()
);

create index withdrawal_audit_request_idx
on public.withdrawal_audit_log (
  withdrawal_request_id,
  created_at desc
);

create index withdrawal_audit_position_idx
on public.withdrawal_audit_log (
  position_id,
  created_at desc
);


-- =========================================================
-- ROW-LEVEL SECURITY
-- Direct client reads and writes remain disabled.
-- Data will be exposed only through protected RPC functions.
-- =========================================================

alter table public.portfolio_profit_credits
enable row level security;

alter table public.investor_withdrawal_requests
enable row level security;

alter table public.withdrawal_audit_log
enable row level security;

revoke all
on public.portfolio_profit_credits
from public, anon, authenticated;

revoke all
on public.investor_withdrawal_requests
from public, anon, authenticated;

revoke all
on public.withdrawal_audit_log
from public, anon, authenticated;


comment on table public.portfolio_profit_credits is
  'Immutable finance-recorded realized profit available for investor withdrawal.';

comment on table public.investor_withdrawal_requests is
  'Controlled investor withdrawal requests processed manually by authorized staff.';

comment on table public.withdrawal_audit_log is
  'Immutable audit history for withdrawal request status changes.';

commit;