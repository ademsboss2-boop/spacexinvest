import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import AdminPortfolioClient, {
  type FinancePortfolio
} from '../../../components/platform/AdminPortfolioClient'
import { createClient } from '../../../lib/supabase/server'

type RawFinancePortfolio = {
  position_id: string
  application_id: string
  application_reference: string

  investor_user_id: string
  investor_email: string
  investor_display_name: string

  opportunity_title: string
  portfolio_status: string

  funded_capital: number | string
  current_value: number | string
  total_distributions: number | string
  total_pnl: number | string
  roi_percentage: number | string

  last_valued_at: string | null
}

export default async function AdminPortfolioPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(
        '/admin/portfolio'
      )}`
    )
  }

  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    !staffRole ||
    !['finance', 'admin'].includes(staffRole.role)
  ) {
    redirect('/dashboard')
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()

  if (
    assuranceError ||
    assurance.currentLevel !== 'aal2'
  ) {
    redirect(
      `/auth/mfa?next=${encodeURIComponent(
        '/admin/portfolio'
      )}`
    )
  }

  const { data, error } = await supabase.rpc(
    'list_finance_portfolios',
    {
      p_limit: 200
    }
  )

  if (error) {
    throw new Error(
      `Unable to load finance portfolios: ${error.message}`
    )
  }

  const portfolios: FinancePortfolio[] = (
    (data ?? []) as RawFinancePortfolio[]
  ).map((portfolio) => ({
    positionId: portfolio.position_id,
    applicationId: portfolio.application_id,
    applicationReference:
      portfolio.application_reference,

    investorUserId: portfolio.investor_user_id,
    investorEmail: portfolio.investor_email,
    investorDisplayName:
      portfolio.investor_display_name,

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
    totalDistributions: Number(
      portfolio.total_distributions
    ),
    totalPnl: Number(portfolio.total_pnl),
    roiPercentage: Number(
      portfolio.roi_percentage
    ),

    lastValuedAt: portfolio.last_valued_at
  }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <AdminPortfolioClient
        initialPortfolios={portfolios}
      />

      <PlatformFooter />
    </main>
  )
}
