import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import InvestorPortfolioClient, {
  type InvestorPortfolio
} from '../../../components/platform/InvestorPortfolioClient'
import type { PortfolioPerformancePoint } from '../../../components/platform/PortfolioPerformanceChart'
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

type RawPortfolioValuation = {
  position_id: string
  current_value: number | string
  as_of_date: string
  created_at: string
}

type RawPortfolioDistribution = {
  position_id: string
  distribution_type:
    | 'income'
    | 'realized_profit'
    | 'return_of_capital'
  amount: number | string
  effective_date: string
  created_at: string
}

type RawVerifiedDeposit = {
  application_id: string
  credited_usd_amount: number | string | null
  reviewed_at: string | null
}

function dateOnly(value: string) {
  return value.slice(0, 10)
}

function numericAmount(
  value: number | string | null | undefined
) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function roundCurrency(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100
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

  const positionIds = portfolios.map(
    (portfolio) => portfolio.positionId
  )

  const applicationIds = portfolios.map(
    (portfolio) => portfolio.applicationId
  )

  let valuationRows: RawPortfolioValuation[] = []
  let distributionRows: RawPortfolioDistribution[] = []
  let depositRows: RawVerifiedDeposit[] = []

  if (positionIds.length > 0) {
    const {
      data: valuationData,
      error: valuationError
    } = await supabase
      .from('portfolio_valuations')
      .select(
        'position_id, current_value, as_of_date, created_at'
      )
      .in('position_id', positionIds)
      .order('as_of_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (valuationError) {
      throw new Error(
        `Unable to load valuation history: ${valuationError.message}`
      )
    }

    valuationRows =
      (valuationData ?? []) as RawPortfolioValuation[]

    const {
      data: distributionData,
      error: distributionError
    } = await supabase
      .from('portfolio_distributions')
      .select(
        'position_id, distribution_type, amount, effective_date, created_at'
      )
      .in('position_id', positionIds)
      .order('effective_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (distributionError) {
      throw new Error(
        `Unable to load distribution history: ${distributionError.message}`
      )
    }

    distributionRows =
      (distributionData ??
        []) as RawPortfolioDistribution[]
  }

  if (applicationIds.length > 0) {
    const {
      data: depositData,
      error: depositError
    } = await supabase
      .from('investor_deposits')
      .select(
        'application_id, credited_usd_amount, reviewed_at'
      )
      .in('application_id', applicationIds)
      .eq('status', 'verified')
      .not('reviewed_at', 'is', null)
      .order('reviewed_at', { ascending: true })

    if (depositError) {
      throw new Error(
        `Unable to load verified capital history: ${depositError.message}`
      )
    }

    depositRows =
      (depositData ?? []) as RawVerifiedDeposit[]
  }

  const positionByApplication = new Map(
    portfolios.map((portfolio) => [
      portfolio.applicationId,
      portfolio.positionId
    ])
  )

  const deposits = depositRows.flatMap(
    (deposit) => {
      const positionId = positionByApplication.get(
        deposit.application_id
      )

      if (!positionId || !deposit.reviewed_at) {
        return []
      }

      return [
        {
          positionId,
          date: dateOnly(deposit.reviewed_at),
          amount: numericAmount(
            deposit.credited_usd_amount
          )
        }
      ]
    }
  )

  const valuations = valuationRows.map(
    (valuation) => ({
      positionId: valuation.position_id,
      date: dateOnly(valuation.as_of_date),
      currentValue: numericAmount(
        valuation.current_value
      )
    })
  )

  const distributions = distributionRows.map(
    (distribution) => ({
      positionId: distribution.position_id,
      date: dateOnly(distribution.effective_date),
      type: distribution.distribution_type,
      amount: numericAmount(distribution.amount)
    })
  )

  const eventDates = new Set<string>()

  for (const deposit of deposits) {
    eventDates.add(deposit.date)
  }

  for (const valuation of valuations) {
    eventDates.add(valuation.date)
  }

  for (const distribution of distributions) {
    eventDates.add(distribution.date)
  }

  const performancePoints: PortfolioPerformancePoint[] =
    Array.from(eventDates)
      .sort((left, right) =>
        left.localeCompare(right)
      )
      .map((date) => {
        let totalPnl = 0

        for (const portfolio of portfolios) {
          const fundedCapital = deposits
            .filter(
              (deposit) =>
                deposit.positionId ===
                  portfolio.positionId &&
                deposit.date <= date
            )
            .reduce(
              (sum, deposit) =>
                sum + deposit.amount,
              0
            )

          if (fundedCapital <= 0) {
            continue
          }

          const positionDistributions =
            distributions.filter(
              (distribution) =>
                distribution.positionId ===
                  portfolio.positionId &&
                distribution.date <= date
            )

          const returnedCapital =
            positionDistributions
              .filter(
                (distribution) =>
                  distribution.type ===
                  'return_of_capital'
              )
              .reduce(
                (sum, distribution) =>
                  sum + distribution.amount,
                0
              )

          const realizedPnl =
            positionDistributions
              .filter(
                (distribution) =>
                  distribution.type === 'income' ||
                  distribution.type ===
                    'realized_profit'
              )
              .reduce(
                (sum, distribution) =>
                  sum + distribution.amount,
                0
              )

          let latestValue: number | null = null

          for (const valuation of valuations) {
            if (
              valuation.positionId ===
                portfolio.positionId &&
              valuation.date <= date
            ) {
              latestValue = valuation.currentValue
            }
          }

          const positionValue =
            latestValue ?? fundedCapital

          const positionNetCapital = Math.max(
            fundedCapital - returnedCapital,
            0
          )

          totalPnl +=
            positionValue -
            positionNetCapital +
            realizedPnl
        }

        return {
          date,
          totalPnl: roundCurrency(totalPnl)
        }
      })
  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <InvestorPortfolioClient
        portfolios={portfolios}
        performancePoints={performancePoints}
      />

      <PlatformFooter />
    </main>
  )
}
