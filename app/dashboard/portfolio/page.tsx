import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import InvestorPortfolioClient, {
  type InvestorPortfolio
} from '../../../components/platform/InvestorPortfolioClient'
import { createClient } from '../../../lib/supabase/server'

type RawInvestorPortfolio = {
  position_id: string
  application_id: string
  application_reference: string
  opportunity_title: string
  portfolio_status: string

  funded_capital: number | string
  current_value: number | string

  income_distributions: number | string
  realized_profit_distributions: number | string
  returned_capital: number | string
  total_distributions: number | string

  net_invested_capital: number | string
  unrealized_pnl: number | string
  realized_pnl: number | string
  total_pnl: number | string
  roi_percentage: number | string

  last_valued_at: string | null
}

export default async function PortfolioPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(
        '/dashboard/portfolio'
      )}`
    )
  }

  const { data, error } = await supabase.rpc(
    'list_investor_portfolios'
  )

  if (error) {
    throw new Error(
      `Unable to load investor portfolio: ${error.message}`
    )
  }

  const portfolios: InvestorPortfolio[] = (
    (data ?? []) as RawInvestorPortfolio[]
  ).map((portfolio) => ({
    positionId: portfolio.position_id,
    applicationId: portfolio.application_id,
    applicationReference:
      portfolio.application_reference,
    opportunityTitle:
      portfolio.opportunity_title,
    portfolioStatus:
      portfolio.portfolio_status,

    fundedCapital: Number(
      portfolio.funded_capital
    ),
    currentValue: Number(
      portfolio.current_value
    ),

    incomeDistributions: Number(
      portfolio.income_distributions
    ),
    realizedProfitDistributions: Number(
      portfolio.realized_profit_distributions
    ),
    returnedCapital: Number(
      portfolio.returned_capital
    ),
    totalDistributions: Number(
      portfolio.total_distributions
    ),

    netInvestedCapital: Number(
      portfolio.net_invested_capital
    ),
    unrealizedPnl: Number(
      portfolio.unrealized_pnl
    ),
    realizedPnl: Number(
      portfolio.realized_pnl
    ),
    totalPnl: Number(
      portfolio.total_pnl
    ),
    roiPercentage: Number(
      portfolio.roi_percentage
    ),

    lastValuedAt:
      portfolio.last_valued_at
  }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <InvestorPortfolioClient
        portfolios={portfolios}
      />

      <PlatformFooter />
    </main>
  )
}
