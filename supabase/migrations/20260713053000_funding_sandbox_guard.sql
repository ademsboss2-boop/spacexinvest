begin;

-- =========================================================
-- FUNDING ENVIRONMENT GUARD
-- The current internal pilot accepts only sandbox/testnet
-- wallet configurations. Production activation requires a
-- separate reviewed migration.
-- =========================================================

alter table public.funding_wallets
add column if not exists environment text
not null default 'sandbox';

alter table public.funding_wallets
drop constraint if exists
  funding_wallets_environment_check;

alter table public.funding_wallets
add constraint funding_wallets_environment_check
check (environment = 'sandbox');


-- Prevent activation when existing rows do not clearly identify
-- a sandbox, demo, or testnet network.
do $$
begin
  if exists (
    select 1
    from public.funding_wallets
    where upper(btrim(network)) not like '%TESTNET%'
      and upper(btrim(network)) not like '%SANDBOX%'
      and upper(btrim(network)) not like '%DEMO%'
  ) then
    raise exception
      'Existing wallet records must be reviewed before sandbox enforcement can be activated.';
  end if;
end;
$$;


create or replace function
public.enforce_sandbox_funding_wallet()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_network text;
begin
  v_network := upper(btrim(coalesce(new.network, '')));

  if v_network not like '%TESTNET%'
     and v_network not like '%SANDBOX%'
     and v_network not like '%DEMO%' then
    raise exception
      'Only sandbox, demo, or testnet wallet networks are permitted in this build.'
      using errcode = '22023';
  end if;

  new.environment := 'sandbox';

  return new;
end;
$$;

drop trigger if exists
  enforce_funding_wallet_sandbox
on public.funding_wallets;

create trigger enforce_funding_wallet_sandbox
before insert or update of network, environment
on public.funding_wallets
for each row
execute function public.enforce_sandbox_funding_wallet();

commit;
