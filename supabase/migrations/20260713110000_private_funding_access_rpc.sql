begin;

-- Investors must not query the wallet table directly.
-- Finance/Admin retain access through the existing finance policy.
drop policy if exists
  "funding_wallets_select_approved_investors"
on public.funding_wallets;

-- Return funding instructions only for the specific application
-- owned by the signed-in investor.
create or replace function
public.list_investor_funding_wallets(
  p_application_id uuid
)
returns table (
  id uuid,
  asset text,
  network text,
  address text,
  display_name text,
  instructions text
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
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
      and coalesce(application.amount, 0) > 0
  ) then
    raise exception
      'An approved application with an allocation is required.'
      using errcode = '42501';
  end if;

  return query
  select
    wallet.id,
    wallet.asset,
    wallet.network,
    wallet.address,
    wallet.display_name,
    wallet.instructions
  from public.funding_wallets as wallet
  where wallet.is_active
    and wallet.environment = 'sandbox'
  order by
    wallet.asset asc,
    wallet.network asc;
end;
$$;

revoke all
on function public.list_investor_funding_wallets(uuid)
from public, anon;

grant execute
on function public.list_investor_funding_wallets(uuid)
to authenticated;

commit;