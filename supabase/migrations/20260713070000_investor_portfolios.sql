begin;

-- =========================================================
-- INVESTOR PORTFOLIO POSITIONS
-- One position exists for each funded application.
-- Capital is derived from verified investor deposits.
-- =========================================================

create table public.portfolio_positions (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null unique
    references public.investment_applications(id)
    on delete restrict,

  investor_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  opportunity_id uuid
    references public.opportunities(id)
    on delete restrict,

  status text not null default 'funding'
    check (
      status in (
        'funding',
        'active',
        'closed'
      )
    ),

  activated_at timestamp with time zone,
  closed_at timestamp with time zone,

  created_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now()
);

create index portfolio_positions_investor_idx
on public.portfolio_positions (
  investor_user_id,
  created_at desc
);

create index portfolio_positions_status_idx
on public.portfolio_positions (
  status,
  updated_at desc
);


-- =========================================================
-- PORTFOLIO VALUATIONS
-- Finance records the position's value at a point in time.
-- Existing records are never overwritten.
-- =========================================================

create table public.portfolio_valuations (
  id uuid primary key default gen_random_uuid(),

  position_id uuid not null
    references public.portfolio_positions(id)
    on delete restrict,

  current_value numeric(18, 2) not null
    check (current_value >= 0),

  as_of_date date not null,

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

create index portfolio_valuations_position_date_idx
on public.portfolio_valuations (
  position_id,
  as_of_date desc,
  created_at desc
);


-- =========================================================
-- PORTFOLIO DISTRIBUTIONS
-- Income and realized profit affect realized P&L.
-- Return of capital reduces remaining invested capital.
-- =========================================================

create table public.portfolio_distributions (
  id uuid primary key default gen_random_uuid(),

  position_id uuid not null
    references public.portfolio_positions(id)
    on delete restrict,

  distribution_type text not null
    check (
      distribution_type in (
        'income',
        'realized_profit',
        'return_of_capital'
      )
    ),

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

create index portfolio_distributions_position_date_idx
on public.portfolio_distributions (
  position_id,
  effective_date desc,
  created_at desc
);


-- =========================================================
-- IMMUTABLE PORTFOLIO AUDIT LOG
-- =========================================================

create table public.portfolio_audit_log (
  id uuid primary key default gen_random_uuid(),

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
        'position_created',
        'status_changed',
        'valuation_recorded',
        'distribution_recorded'
      )
    ),

  previous_status text,
  new_status text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone
    not null default now()
);

create index portfolio_audit_position_created_idx
on public.portfolio_audit_log (
  position_id,
  created_at desc
);

create index portfolio_audit_application_created_idx
on public.portfolio_audit_log (
  application_id,
  created_at desc
);


-- =========================================================
-- ROW-LEVEL SECURITY
-- Investors read only their own portfolio.
-- MFA-verified Finance and Admin users may read all records.
-- =========================================================

alter table public.portfolio_positions
enable row level security;

alter table public.portfolio_valuations
enable row level security;

alter table public.portfolio_distributions
enable row level security;

alter table public.portfolio_audit_log
enable row level security;


create policy "portfolio_positions_select_own"
on public.portfolio_positions
for select
to authenticated
using (
  investor_user_id = (select auth.uid())
);

create policy "portfolio_positions_select_finance"
on public.portfolio_positions
for select
to authenticated
using (public.is_finance_staff());


create policy "portfolio_valuations_select_own"
on public.portfolio_valuations
for select
to authenticated
using (
  exists (
    select 1
    from public.portfolio_positions as position
    where position.id = position_id
      and position.investor_user_id =
        (select auth.uid())
  )
);

create policy "portfolio_valuations_select_finance"
on public.portfolio_valuations
for select
to authenticated
using (public.is_finance_staff());


create policy "portfolio_distributions_select_own"
on public.portfolio_distributions
for select
to authenticated
using (
  exists (
    select 1
    from public.portfolio_positions as position
    where position.id = position_id
      and position.investor_user_id =
        (select auth.uid())
  )
);

create policy "portfolio_distributions_select_finance"
on public.portfolio_distributions
for select
to authenticated
using (public.is_finance_staff());


create policy "portfolio_audit_select_own"
on public.portfolio_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.portfolio_positions as position
    where position.id = position_id
      and position.investor_user_id =
        (select auth.uid())
  )
);

create policy "portfolio_audit_select_finance"
on public.portfolio_audit_log
for select
to authenticated
using (public.is_finance_staff());


grant select
on public.portfolio_positions,
   public.portfolio_valuations,
   public.portfolio_distributions,
   public.portfolio_audit_log
to authenticated;

revoke insert, update, delete
on public.portfolio_positions,
   public.portfolio_valuations,
   public.portfolio_distributions,
   public.portfolio_audit_log
from anon, authenticated;


-- =========================================================
-- POSITION UPDATED-AT TRIGGER
-- =========================================================

create or replace function public.set_portfolio_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger portfolio_positions_set_updated_at
before update
on public.portfolio_positions
for each row
execute function public.set_portfolio_updated_at();


-- =========================================================
-- POSITION AUDIT TRIGGER
-- =========================================================

create or replace function public.record_position_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.portfolio_audit_log (
      position_id,
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
      'position_created',
      null,
      new.status,
      jsonb_build_object(
        'source',
        'verified_capital'
      )
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.portfolio_audit_log (
      position_id,
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
      'status_changed',
      old.status,
      new.status,
      '{}'::jsonb
    );
  end if;

  return new;
end;
$$;

create trigger on_portfolio_position_changed
after insert or update of status
on public.portfolio_positions
for each row
execute function public.record_position_audit();


-- =========================================================
-- VALUATION AND DISTRIBUTION AUDIT TRIGGERS
-- =========================================================

create or replace function public.record_valuation_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application_id uuid;
begin
  select position.application_id
  into v_application_id
  from public.portfolio_positions as position
  where position.id = new.position_id;

  insert into public.portfolio_audit_log (
    position_id,
    application_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    new.position_id,
    v_application_id,
    auth.uid(),
    'valuation_recorded',
    jsonb_build_object(
      'valuation_id', new.id,
      'current_value', new.current_value,
      'as_of_date', new.as_of_date
    )
  );

  return new;
end;
$$;

create trigger on_portfolio_valuation_recorded
after insert
on public.portfolio_valuations
for each row
execute function public.record_valuation_audit();


create or replace function public.record_distribution_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application_id uuid;
begin
  select position.application_id
  into v_application_id
  from public.portfolio_positions as position
  where position.id = new.position_id;

  insert into public.portfolio_audit_log (
    position_id,
    application_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    new.position_id,
    v_application_id,
    auth.uid(),
    'distribution_recorded',
    jsonb_build_object(
      'distribution_id', new.id,
      'distribution_type', new.distribution_type,
      'amount', new.amount,
      'effective_date', new.effective_date
    )
  );

  return new;
end;
$$;

create trigger on_portfolio_distribution_recorded
after insert
on public.portfolio_distributions
for each row
execute function public.record_distribution_audit();


-- =========================================================
-- AUTOMATIC POSITION CREATION
-- A verified deposit creates or updates the related position.
-- The position becomes active once minimum capital is reached.
-- =========================================================

create or replace function
public.sync_position_from_verified_deposit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_opportunity_id uuid;
  v_minimum numeric;
  v_funded_capital numeric;
  v_position_status text;
begin
  if new.status <> 'verified'
     or new.credited_usd_amount is null then
    return new;
  end if;

  select
    application.opportunity_id,
    coalesce(
      opportunity.minimum_investment,
      application.amount,
      0
    )::numeric
  into
    v_opportunity_id,
    v_minimum
  from public.investment_applications as application
  left join public.opportunities as opportunity
    on opportunity.id = application.opportunity_id
  where application.id = new.application_id;

  select coalesce(
    sum(deposit.credited_usd_amount),
    0
  )
  into v_funded_capital
  from public.investor_deposits as deposit
  where deposit.application_id = new.application_id
    and deposit.status = 'verified';

  v_position_status :=
    case
      when v_funded_capital >= v_minimum
        then 'active'
      else 'funding'
    end;

  insert into public.portfolio_positions (
    application_id,
    investor_user_id,
    opportunity_id,
    status,
    activated_at
  )
  values (
    new.application_id,
    new.investor_user_id,
    v_opportunity_id,
    v_position_status,
    case
      when v_position_status = 'active'
        then now()
      else null
    end
  )
  on conflict (application_id)
  do update
  set
    status =
      case
        when portfolio_positions.status = 'closed'
          then 'closed'
        else excluded.status
      end,

    activated_at =
      case
        when portfolio_positions.activated_at is not null
          then portfolio_positions.activated_at
        when excluded.status = 'active'
          then now()
        else null
      end,

    updated_at = now();

  return new;
end;
$$;

create trigger on_verified_deposit_sync_position
after insert or update of status, credited_usd_amount
on public.investor_deposits
for each row
when (
  new.status = 'verified'
  and new.credited_usd_amount is not null
)
execute function
  public.sync_position_from_verified_deposit();


-- =========================================================
-- BASELINE POSITIONS FOR EXISTING VERIFIED CAPITAL
-- =========================================================

insert into public.portfolio_positions (
  application_id,
  investor_user_id,
  opportunity_id,
  status,
  activated_at,
  created_at
)
select
  application.id,
  application.user_id,
  application.opportunity_id,

  case
    when sum(deposit.credited_usd_amount) >=
      coalesce(
        opportunity.minimum_investment,
        application.amount,
        0
      )
      then 'active'
    else 'funding'
  end,

  case
    when sum(deposit.credited_usd_amount) >=
      coalesce(
        opportunity.minimum_investment,
        application.amount,
        0
      )
      then max(deposit.reviewed_at)
    else null
  end,

  min(
    coalesce(
      deposit.reviewed_at,
      deposit.submitted_at
    )
  )

from public.investment_applications as application

join public.investor_deposits as deposit
  on deposit.application_id = application.id
  and deposit.status = 'verified'
  and deposit.credited_usd_amount is not null

left join public.opportunities as opportunity
  on opportunity.id = application.opportunity_id

group by
  application.id,
  application.user_id,
  application.opportunity_id,
  application.amount,
  opportunity.minimum_investment

having sum(deposit.credited_usd_amount) > 0

on conflict (application_id) do nothing;


-- =========================================================
-- FINANCE VALUATION RPC
-- =========================================================

create or replace function public.record_portfolio_valuation(
  p_application_id uuid,
  p_current_value numeric,
  p_as_of_date date default current_date,
  p_finance_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_position_id uuid;
  v_valuation_id uuid;
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

  if p_current_value is null
     or p_current_value < 0 then
    raise exception
      'Current value cannot be negative.'
      using errcode = '22023';
  end if;

  if p_as_of_date is null
     or p_as_of_date > current_date then
    raise exception
      'Valuation date cannot be in the future.'
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

  select position.id
  into v_position_id
  from public.portfolio_positions as position
  where position.application_id = p_application_id;

  if v_position_id is null then
    raise exception
      'A funded portfolio position was not found.'
      using errcode = 'P0002';
  end if;

  insert into public.portfolio_valuations (
    position_id,
    current_value,
    as_of_date,
    finance_note,
    created_by
  )
  values (
    v_position_id,
    p_current_value,
    p_as_of_date,
    v_note,
    auth.uid()
  )
  returning id into v_valuation_id;

  return v_valuation_id;
end;
$$;


-- =========================================================
-- FINANCE DISTRIBUTION RPC
-- =========================================================

create or replace function
public.record_portfolio_distribution(
  p_application_id uuid,
  p_distribution_type text,
  p_amount numeric,
  p_effective_date date default current_date,
  p_finance_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_position_id uuid;
  v_distribution_id uuid;
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

  if p_distribution_type not in (
    'income',
    'realized_profit',
    'return_of_capital'
  ) then
    raise exception
      'Invalid distribution type.'
      using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception
      'Distribution amount must be greater than zero.'
      using errcode = '22023';
  end if;

  if p_effective_date is null
     or p_effective_date > current_date then
    raise exception
      'Distribution date cannot be in the future.'
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

  select position.id
  into v_position_id
  from public.portfolio_positions as position
  where position.application_id = p_application_id;

  if v_position_id is null then
    raise exception
      'A funded portfolio position was not found.'
      using errcode = 'P0002';
  end if;

  insert into public.portfolio_distributions (
    position_id,
    distribution_type,
    amount,
    effective_date,
    finance_note,
    created_by
  )
  values (
    v_position_id,
    p_distribution_type,
    p_amount,
    p_effective_date,
    v_note,
    auth.uid()
  )
  returning id into v_distribution_id;

  return v_distribution_id;
end;
$$;


-- =========================================================
-- FINANCE POSITION STATUS RPC
-- =========================================================

create or replace function public.set_portfolio_status(
  p_application_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_position_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not public.is_finance_staff() then
    raise exception 'Finance access required.'
      using errcode = '42501';
  end if;

  if p_status not in (
    'funding',
    'active',
    'closed'
  ) then
    raise exception 'Invalid portfolio status.'
      using errcode = '22023';
  end if;

  update public.portfolio_positions as position
  set
    status = p_status,

    activated_at =
      case
        when p_status = 'active'
          then coalesce(
            position.activated_at,
            now()
          )
        else position.activated_at
      end,

    closed_at =
      case
        when p_status = 'closed'
          then coalesce(
            position.closed_at,
            now()
          )
        else null
      end

  where position.application_id =
    p_application_id

  returning position.id
  into v_position_id;

  if v_position_id is null then
    raise exception
      'Portfolio position not found.'
      using errcode = 'P0002';
  end if;

  return true;
end;
$$;


-- =========================================================
-- INVESTOR PORTFOLIO SUMMARY RPC
-- Current value defaults to funded capital until Finance
-- records the first valuation.
-- =========================================================

create or replace function public.list_investor_portfolios()
returns table (
  position_id uuid,
  application_id uuid,
  application_reference text,
  opportunity_title text,
  portfolio_status text,

  funded_capital numeric,
  current_value numeric,

  income_distributions numeric,
  realized_profit_distributions numeric,
  returned_capital numeric,
  total_distributions numeric,

  net_invested_capital numeric,
  unrealized_pnl numeric,
  realized_pnl numeric,
  total_pnl numeric,
  roi_percentage numeric,

  last_valued_at timestamp with time zone
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
  with portfolio_data as (
    select
      position.id as position_id,
      position.application_id,
      application.reference_code,
      coalesce(
        opportunity.title,
        'Investment Opportunity'
      ) as opportunity_title,
      position.status,

      coalesce(deposit.funded_capital, 0)::numeric
        as funded_capital,

      coalesce(
        valuation.current_value,
        deposit.funded_capital,
        0
      )::numeric as current_value,

      coalesce(distribution.income, 0)::numeric
        as income_distributions,

      coalesce(
        distribution.realized_profit,
        0
      )::numeric
        as realized_profit_distributions,

      coalesce(
        distribution.returned_capital,
        0
      )::numeric as returned_capital,

      coalesce(
        distribution.total_distributions,
        0
      )::numeric as total_distributions,

      valuation.created_at as last_valued_at

    from public.portfolio_positions as position

    join public.investment_applications as application
      on application.id = position.application_id

    left join public.opportunities as opportunity
      on opportunity.id = position.opportunity_id

    left join lateral (
      select coalesce(
        sum(investor_deposit.credited_usd_amount),
        0
      ) as funded_capital
      from public.investor_deposits
        as investor_deposit
      where investor_deposit.application_id =
        position.application_id
        and investor_deposit.status = 'verified'
    ) as deposit on true

    left join lateral (
      select
        portfolio_valuation.current_value,
        portfolio_valuation.created_at
      from public.portfolio_valuations
        as portfolio_valuation
      where portfolio_valuation.position_id =
        position.id
      order by
        portfolio_valuation.as_of_date desc,
        portfolio_valuation.created_at desc
      limit 1
    ) as valuation on true

    left join lateral (
      select
        coalesce(
          sum(portfolio_distribution.amount)
            filter (
              where
                portfolio_distribution.distribution_type =
                  'income'
            ),
          0
        ) as income,

        coalesce(
          sum(portfolio_distribution.amount)
            filter (
              where
                portfolio_distribution.distribution_type =
                  'realized_profit'
            ),
          0
        ) as realized_profit,

        coalesce(
          sum(portfolio_distribution.amount)
            filter (
              where
                portfolio_distribution.distribution_type =
                  'return_of_capital'
            ),
          0
        ) as returned_capital,

        coalesce(
          sum(portfolio_distribution.amount),
          0
        ) as total_distributions

      from public.portfolio_distributions
        as portfolio_distribution

      where portfolio_distribution.position_id =
        position.id
    ) as distribution on true

    where position.investor_user_id =
      auth.uid()
  )

  select
    data.position_id,
    data.application_id,
    data.reference_code,
    data.opportunity_title,
    data.status,

    data.funded_capital,
    data.current_value,

    data.income_distributions,
    data.realized_profit_distributions,
    data.returned_capital,
    data.total_distributions,

    greatest(
      data.funded_capital -
      data.returned_capital,
      0
    )::numeric as net_invested_capital,

    (
      data.current_value -
      greatest(
        data.funded_capital -
        data.returned_capital,
        0
      )
    )::numeric as unrealized_pnl,

    (
      data.income_distributions +
      data.realized_profit_distributions
    )::numeric as realized_pnl,

    (
      data.current_value +
      data.total_distributions -
      data.funded_capital
    )::numeric as total_pnl,

    case
      when data.funded_capital > 0 then
        (
          (
            data.current_value +
            data.total_distributions -
            data.funded_capital
          ) /
          data.funded_capital *
          100
        )::numeric
      else 0::numeric
    end as roi_percentage,

    data.last_valued_at

  from portfolio_data as data

  order by
    case data.status
      when 'active' then 0
      when 'funding' then 1
      else 2
    end,
    data.opportunity_title;
end;
$$;


-- =========================================================
-- FINANCE PORTFOLIO SUMMARY RPC
-- =========================================================

create or replace function public.list_finance_portfolios(
  p_limit integer default 200
)
returns table (
  position_id uuid,
  application_id uuid,
  application_reference text,

  investor_user_id uuid,
  investor_email text,
  investor_display_name text,

  opportunity_title text,
  portfolio_status text,

  funded_capital numeric,
  current_value numeric,
  total_distributions numeric,
  total_pnl numeric,
  roi_percentage numeric,

  last_valued_at timestamp with time zone
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
  with portfolio_data as (
    select
      position.id as position_id,
      position.application_id,
      application.reference_code,

      position.investor_user_id,
      user_record.email::text as investor_email,

      coalesce(
        nullif(btrim(profile.display_name), ''),
        split_part(user_record.email::text, '@', 1),
        'Investor'
      ) as investor_display_name,

      coalesce(
        opportunity.title,
        'Investment Opportunity'
      ) as opportunity_title,

      position.status,

      coalesce(deposit.funded_capital, 0)::numeric
        as funded_capital,

      coalesce(
        valuation.current_value,
        deposit.funded_capital,
        0
      )::numeric as current_value,

      coalesce(
        distribution.total_distributions,
        0
      )::numeric as total_distributions,

      valuation.created_at as last_valued_at

    from public.portfolio_positions as position

    join public.investment_applications as application
      on application.id = position.application_id

    join auth.users as user_record
      on user_record.id = position.investor_user_id

    left join public.profiles as profile
      on profile.id = position.investor_user_id

    left join public.opportunities as opportunity
      on opportunity.id = position.opportunity_id

    left join lateral (
      select coalesce(
        sum(investor_deposit.credited_usd_amount),
        0
      ) as funded_capital
      from public.investor_deposits
        as investor_deposit
      where investor_deposit.application_id =
        position.application_id
        and investor_deposit.status = 'verified'
    ) as deposit on true

    left join lateral (
      select
        portfolio_valuation.current_value,
        portfolio_valuation.created_at
      from public.portfolio_valuations
        as portfolio_valuation
      where portfolio_valuation.position_id =
        position.id
      order by
        portfolio_valuation.as_of_date desc,
        portfolio_valuation.created_at desc
      limit 1
    ) as valuation on true

    left join lateral (
      select coalesce(
        sum(portfolio_distribution.amount),
        0
      ) as total_distributions
      from public.portfolio_distributions
        as portfolio_distribution
      where portfolio_distribution.position_id =
        position.id
    ) as distribution on true
  )

  select
    data.position_id,
    data.application_id,
    data.reference_code,

    data.investor_user_id,
    data.investor_email,
    data.investor_display_name,

    data.opportunity_title,
    data.status,

    data.funded_capital,
    data.current_value,
    data.total_distributions,

    (
      data.current_value +
      data.total_distributions -
      data.funded_capital
    )::numeric as total_pnl,

    case
      when data.funded_capital > 0 then
        (
          (
            data.current_value +
            data.total_distributions -
            data.funded_capital
          ) /
          data.funded_capital *
          100
        )::numeric
      else 0::numeric
    end as roi_percentage,

    data.last_valued_at

  from portfolio_data as data

  order by
    case data.status
      when 'active' then 0
      when 'funding' then 1
      else 2
    end,
    data.investor_display_name,
    data.opportunity_title

  limit v_limit;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.record_portfolio_valuation(
  uuid,
  numeric,
  date,
  text
)
from public, anon;

revoke all
on function public.record_portfolio_distribution(
  uuid,
  text,
  numeric,
  date,
  text
)
from public, anon;

revoke all
on function public.set_portfolio_status(
  uuid,
  text
)
from public, anon;

revoke all
on function public.list_investor_portfolios()
from public, anon;

revoke all
on function public.list_finance_portfolios(integer)
from public, anon;


grant execute
on function public.record_portfolio_valuation(
  uuid,
  numeric,
  date,
  text
)
to authenticated;

grant execute
on function public.record_portfolio_distribution(
  uuid,
  text,
  numeric,
  date,
  text
)
to authenticated;

grant execute
on function public.set_portfolio_status(
  uuid,
  text
)
to authenticated;

grant execute
on function public.list_investor_portfolios()
to authenticated;

grant execute
on function public.list_finance_portfolios(integer)
to authenticated;

commit;
