begin;

-- =========================================================
-- FINANCE STAFF ROLE
-- Finance users can manage wallet instructions, deposits,
-- credited capital, and later portfolio valuations.
-- =========================================================

alter table public.staff_roles
drop constraint if exists staff_roles_role_check;

alter table public.staff_roles
add constraint staff_roles_role_check
check (
  role in ('reviewer', 'finance', 'admin')
);

alter table public.staff_role_audit_log
drop constraint if exists
  staff_role_audit_log_previous_role_check;

alter table public.staff_role_audit_log
add constraint
  staff_role_audit_log_previous_role_check
check (
  previous_role is null
  or previous_role in ('reviewer', 'finance', 'admin')
);

alter table public.staff_role_audit_log
drop constraint if exists
  staff_role_audit_log_new_role_check;

alter table public.staff_role_audit_log
add constraint
  staff_role_audit_log_new_role_check
check (
  new_role is null
  or new_role in ('reviewer', 'finance', 'admin')
);

alter table public.security_events
drop constraint if exists
  security_events_staff_role_check;

alter table public.security_events
add constraint security_events_staff_role_check
check (
  staff_role is null
  or staff_role in ('reviewer', 'finance', 'admin')
);


-- =========================================================
-- MFA-VERIFIED FINANCE ACCESS HELPER
-- =========================================================

create or replace function public.is_finance_staff()
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
        and role in ('finance', 'admin')
    );
$$;

revoke all
on function public.is_finance_staff()
from public, anon;

grant execute
on function public.is_finance_staff()
to authenticated;


-- =========================================================
-- UPDATE STAFF ROLE MANAGEMENT TO SUPPORT FINANCE
-- =========================================================

create or replace function public.set_staff_role(
  p_email text,
  p_role text
)
returns table (
  staff_user_id uuid,
  staff_email text,
  staff_display_name text,
  staff_role text,
  staff_since timestamp with time zone,
  email_confirmed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_target_user_id uuid;
  v_target_email text;
  v_confirmed_at timestamp with time zone;
  v_current_role text;
  v_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_staff_admin() then
    raise exception 'Administrator access required.'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_email, '')), '') is null then
    raise exception 'A staff account email is required.'
      using errcode = '22023';
  end if;

  if p_role not in ('reviewer', 'finance', 'admin') then
    raise exception 'Invalid staff role.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(913027451);

  select
    user_record.id,
    user_record.email::text,
    user_record.email_confirmed_at
  into
    v_target_user_id,
    v_target_email,
    v_confirmed_at
  from auth.users as user_record
  where lower(user_record.email::text) =
    lower(btrim(p_email))
  limit 1;

  if v_target_user_id is null then
    raise exception
      'No registered account was found for that email address.'
      using errcode = 'P0002';
  end if;

  if v_confirmed_at is null then
    raise exception
      'The account email must be verified before staff access can be assigned.'
      using errcode = '22023';
  end if;

  select staff.role
  into v_current_role
  from public.staff_roles as staff
  where staff.user_id = v_target_user_id;

  if v_current_role = 'admin'
     and p_role <> 'admin' then
    select count(*)
    into v_admin_count
    from public.staff_roles
    where role = 'admin';

    if v_admin_count <= 1 then
      raise exception
        'The final administrator cannot be demoted.'
        using errcode = '22023';
    end if;
  end if;

  if v_current_role is null then
    insert into public.staff_roles (
      user_id,
      role
    )
    values (
      v_target_user_id,
      p_role
    );

  elsif v_current_role <> p_role then
    update public.staff_roles
    set role = p_role
    where user_id = v_target_user_id;
  end if;

  return query
  select
    staff.user_id,
    user_record.email::text,
    coalesce(
      nullif(btrim(profile.display_name), ''),
      split_part(user_record.email::text, '@', 1),
      'Staff Member'
    ),
    staff.role,
    staff.created_at,
    user_record.email_confirmed_at is not null
  from public.staff_roles as staff
  join auth.users as user_record
    on user_record.id = staff.user_id
  left join public.profiles as profile
    on profile.id = staff.user_id
  where staff.user_id = v_target_user_id;
end;
$$;


-- =========================================================
-- ORGANIZATION RECEIVING WALLETS
-- Stores public receiving addresses and instructions only.
-- Never store keys, secrets, passwords, or seed phrases.
-- =========================================================

create table public.funding_wallets (
  id uuid primary key default gen_random_uuid(),

  asset text not null
    check (asset in ('BTC', 'USDT')),

  network text not null
    check (
      char_length(btrim(network)) between 2 and 40
    ),

  address text not null
    check (
      char_length(btrim(address)) between 12 and 200
    ),

  display_name text not null
    check (
      char_length(btrim(display_name)) between 2 and 100
    ),

  instructions text not null default ''
    check (
      char_length(instructions) <= 4000
    ),

  is_active boolean not null default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  updated_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now()
);

create unique index
  funding_wallets_active_asset_network_idx
on public.funding_wallets (
  asset,
  upper(network)
)
where is_active;

create index
  funding_wallets_created_idx
on public.funding_wallets (
  created_at desc
);

alter table public.funding_wallets
enable row level security;

create policy "funding_wallets_select_finance"
on public.funding_wallets
for select
to authenticated
using (public.is_finance_staff());

create policy "funding_wallets_select_approved_investors"
on public.funding_wallets
for select
to authenticated
using (
  is_active
  and exists (
    select 1
    from public.investment_applications as application
    where application.user_id = (select auth.uid())
      and application.status = 'approved'
  )
);

grant select
on public.funding_wallets
to authenticated;

revoke insert, update, delete
on public.funding_wallets
from anon, authenticated;


-- =========================================================
-- INVESTOR DEPOSIT SUBMISSIONS
-- Investors submit transaction details.
-- Finance verifies and assigns the credited USD amount.
-- =========================================================

create table public.investor_deposits (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.investment_applications(id)
    on delete restrict,

  investor_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  wallet_id uuid not null
    references public.funding_wallets(id)
    on delete restrict,

  asset text not null
    check (asset in ('BTC', 'USDT')),

  network text not null,

  wallet_address_snapshot text not null,

  asset_amount numeric(30, 8) not null
    check (asset_amount > 0),

  declared_usd_amount numeric(18, 2)
    check (
      declared_usd_amount is null
      or declared_usd_amount > 0
    ),

  transaction_hash text not null
    check (
      char_length(btrim(transaction_hash))
      between 12 and 200
    ),

  status text not null default 'pending_verification'
    check (
      status in (
        'pending_verification',
        'verified',
        'rejected'
      )
    ),

  investor_note text
    check (
      investor_note is null
      or char_length(investor_note) <= 1000
    ),

  finance_note text
    check (
      finance_note is null
      or char_length(finance_note) <= 2000
    ),

  credited_usd_amount numeric(18, 2)
    check (
      credited_usd_amount is null
      or credited_usd_amount > 0
    ),

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamp with time zone,

  submitted_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now()
);

create unique index
  investor_deposits_network_hash_idx
on public.investor_deposits (
  upper(network),
  lower(transaction_hash)
);

create index
  investor_deposits_investor_created_idx
on public.investor_deposits (
  investor_user_id,
  submitted_at desc
);

create index
  investor_deposits_application_created_idx
on public.investor_deposits (
  application_id,
  submitted_at desc
);

create index
  investor_deposits_pending_idx
on public.investor_deposits (
  submitted_at asc
)
where status = 'pending_verification';

alter table public.investor_deposits
enable row level security;

create policy "investor_deposits_select_own"
on public.investor_deposits
for select
to authenticated
using (
  investor_user_id = (select auth.uid())
);

create policy "investor_deposits_select_finance"
on public.investor_deposits
for select
to authenticated
using (public.is_finance_staff());

grant select
on public.investor_deposits
to authenticated;

revoke insert, update, delete
on public.investor_deposits
from anon, authenticated;


-- =========================================================
-- IMMUTABLE DEPOSIT AUDIT HISTORY
-- =========================================================

create table public.deposit_audit_log (
  id uuid primary key default gen_random_uuid(),

  deposit_id uuid not null
    references public.investor_deposits(id)
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
        'submitted',
        'verified',
        'rejected'
      )
    ),

  previous_status text,
  new_status text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone
    not null default now()
);

create index
  deposit_audit_deposit_created_idx
on public.deposit_audit_log (
  deposit_id,
  created_at desc
);

create index
  deposit_audit_application_created_idx
on public.deposit_audit_log (
  application_id,
  created_at desc
);

alter table public.deposit_audit_log
enable row level security;

create policy "deposit_audit_select_own"
on public.deposit_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.investor_deposits as deposit
    where deposit.id = deposit_id
      and deposit.investor_user_id =
        (select auth.uid())
  )
);

create policy "deposit_audit_select_finance"
on public.deposit_audit_log
for select
to authenticated
using (public.is_finance_staff());

grant select
on public.deposit_audit_log
to authenticated;

revoke insert, update, delete
on public.deposit_audit_log
from anon, authenticated;


-- =========================================================
-- UPDATED-AT TRIGGER
-- =========================================================

create or replace function public.set_funding_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger funding_wallets_set_updated_at
before update
on public.funding_wallets
for each row
execute function public.set_funding_updated_at();

create trigger investor_deposits_set_updated_at
before update
on public.investor_deposits
for each row
execute function public.set_funding_updated_at();


-- =========================================================
-- AUTOMATIC DEPOSIT AUDITING
-- =========================================================

create or replace function public.record_deposit_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.deposit_audit_log (
      deposit_id,
      application_id,
      actor_user_id,
      event_type,
      previous_status,
      new_status,
      metadata
    )
    values (
      new.id,
      new.application_id,
      auth.uid(),
      'submitted',
      null,
      new.status,
      jsonb_build_object(
        'asset', new.asset,
        'network', new.network
      )
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.deposit_audit_log (
      deposit_id,
      application_id,
      actor_user_id,
      event_type,
      previous_status,
      new_status,
      metadata
    )
    values (
      new.id,
      new.application_id,
      auth.uid(),
      case
        when new.status = 'verified' then 'verified'
        else 'rejected'
      end,
      old.status,
      new.status,
      jsonb_build_object(
        'credited_usd_amount',
        new.credited_usd_amount
      )
    );
  end if;

  return new;
end;
$$;

create trigger on_investor_deposit_submitted
after insert
on public.investor_deposits
for each row
execute function public.record_deposit_audit();

create trigger on_investor_deposit_reviewed
after update of status
on public.investor_deposits
for each row
when (old.status is distinct from new.status)
execute function public.record_deposit_audit();


-- =========================================================
-- FINANCE WALLET CONFIGURATION RPC
-- Creates a new active address and retires the previous active
-- address for the same asset and network.
-- =========================================================

create or replace function public.save_funding_wallet(
  p_asset text,
  p_network text,
  p_address text,
  p_display_name text,
  p_instructions text default '',
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_asset text;
  v_network text;
  v_address text;
  v_display_name text;
  v_instructions text;
  v_wallet_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  v_asset := upper(btrim(coalesce(p_asset, '')));
  v_network := upper(btrim(coalesce(p_network, '')));
  v_address := btrim(coalesce(p_address, ''));
  v_display_name := btrim(coalesce(p_display_name, ''));
  v_instructions := btrim(coalesce(p_instructions, ''));

  if v_asset not in ('BTC', 'USDT') then
    raise exception 'Unsupported funding asset.'
      using errcode = '22023';
  end if;

  if char_length(v_network) not between 2 and 40 then
    raise exception 'Invalid wallet network.'
      using errcode = '22023';
  end if;

  if char_length(v_address) not between 12 and 200 then
    raise exception 'Invalid wallet address.'
      using errcode = '22023';
  end if;

  if char_length(v_display_name) not between 2 and 100 then
    raise exception 'Invalid wallet display name.'
      using errcode = '22023';
  end if;

  if char_length(v_instructions) > 4000 then
    raise exception 'Wallet instructions are too long.'
      using errcode = '22023';
  end if;

  if p_is_active then
    update public.funding_wallets
    set
      is_active = false,
      updated_by = auth.uid()
    where asset = v_asset
      and upper(network) = v_network
      and is_active;
  end if;

  insert into public.funding_wallets (
    asset,
    network,
    address,
    display_name,
    instructions,
    is_active,
    created_by,
    updated_by
  )
  values (
    v_asset,
    v_network,
    v_address,
    v_display_name,
    v_instructions,
    p_is_active,
    auth.uid(),
    auth.uid()
  )
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;


-- =========================================================
-- INVESTOR PARTIAL-DEPOSIT SUBMISSION RPC
-- An approved investor may submit multiple deposits.
-- Each verified deposit contributes to the funded total.
-- =========================================================

create or replace function public.submit_investor_deposit(
  p_application_id uuid,
  p_wallet_id uuid,
  p_asset_amount numeric,
  p_declared_usd_amount numeric,
  p_transaction_hash text,
  p_investor_note text default null
)
returns table (
  deposit_id uuid,
  deposit_status text,
  submitted_at timestamp with time zone
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_wallet public.funding_wallets%rowtype;
  v_note text;
  v_transaction_hash text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.investment_applications as application
    where application.id = p_application_id
      and application.user_id = auth.uid()
      and application.status = 'approved'
  ) then
    raise exception
      'An approved application is required before funding.'
      using errcode = '42501';
  end if;

  if p_asset_amount is null or p_asset_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero.'
      using errcode = '22023';
  end if;

  if p_declared_usd_amount is not null
     and p_declared_usd_amount <= 0 then
    raise exception
      'Declared USD amount must be greater than zero.'
      using errcode = '22023';
  end if;

  select *
  into v_wallet
  from public.funding_wallets
  where id = p_wallet_id
    and is_active;

  if v_wallet.id is null then
    raise exception 'The selected funding wallet is unavailable.'
      using errcode = 'P0002';
  end if;

  v_transaction_hash :=
    btrim(coalesce(p_transaction_hash, ''));

  if char_length(v_transaction_hash)
     not between 12 and 200 then
    raise exception 'Enter a valid transaction hash.'
      using errcode = '22023';
  end if;

  v_note := nullif(
    btrim(coalesce(p_investor_note, '')),
    ''
  );

  if v_note is not null
     and char_length(v_note) > 1000 then
    raise exception
      'Investor note cannot exceed 1000 characters.'
      using errcode = '22023';
  end if;

  insert into public.investor_deposits (
    application_id,
    investor_user_id,
    wallet_id,
    asset,
    network,
    wallet_address_snapshot,
    asset_amount,
    declared_usd_amount,
    transaction_hash,
    investor_note
  )
  values (
    p_application_id,
    auth.uid(),
    v_wallet.id,
    v_wallet.asset,
    v_wallet.network,
    v_wallet.address,
    p_asset_amount,
    p_declared_usd_amount,
    v_transaction_hash,
    v_note
  )
  returning
    id,
    status,
    investor_deposits.submitted_at
  into
    deposit_id,
    deposit_status,
    submitted_at;

  return next;
end;
$$;


-- =========================================================
-- FINANCE DEPOSIT REVIEW RPC
-- Finance assigns the final credited USD capital.
-- =========================================================

create or replace function public.review_investor_deposit(
  p_deposit_id uuid,
  p_decision text,
  p_credited_usd_amount numeric default null,
  p_finance_note text default null
)
returns table (
  reviewed_deposit_id uuid,
  reviewed_status text,
  credited_amount numeric
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

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  if p_decision not in ('verified', 'rejected') then
    raise exception 'Invalid deposit review decision.'
      using errcode = '22023';
  end if;

  if p_decision = 'verified'
     and (
       p_credited_usd_amount is null
       or p_credited_usd_amount <= 0
     ) then
    raise exception
      'A credited USD amount is required for verified deposits.'
      using errcode = '22023';
  end if;

  v_note := nullif(
    btrim(coalesce(p_finance_note, '')),
    ''
  );

  if v_note is not null
     and char_length(v_note) > 2000 then
    raise exception
      'Finance note cannot exceed 2000 characters.'
      using errcode = '22023';
  end if;

  update public.investor_deposits as deposit
  set
    status = p_decision,
    credited_usd_amount =
      case
        when p_decision = 'verified'
          then p_credited_usd_amount
        else null
      end,
    finance_note = v_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where deposit.id = p_deposit_id
    and deposit.status = 'pending_verification'
  returning
    deposit.id,
    deposit.status,
    deposit.credited_usd_amount
  into
    reviewed_deposit_id,
    reviewed_status,
    credited_amount;

  if reviewed_deposit_id is null then
    raise exception
      'Pending deposit submission not found.'
      using errcode = 'P0002';
  end if;

  return next;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.save_funding_wallet(
  text,
  text,
  text,
  text,
  text,
  boolean
)
from public, anon;

revoke all
on function public.submit_investor_deposit(
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text
)
from public, anon;

revoke all
on function public.review_investor_deposit(
  uuid,
  text,
  numeric,
  text
)
from public, anon;

grant execute
on function public.save_funding_wallet(
  text,
  text,
  text,
  text,
  text,
  boolean
)
to authenticated;

grant execute
on function public.submit_investor_deposit(
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text
)
to authenticated;

grant execute
on function public.review_investor_deposit(
  uuid,
  text,
  numeric,
  text
)
to authenticated;

commit;
