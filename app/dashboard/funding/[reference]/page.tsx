import React from 'react'
import { notFound, redirect } from 'next/navigation'
import PlatformHeader from '../../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../../components/platform/PlatformFooter'
import InvestorFundingClient, {
  type FundingWallet,
  type InvestorDeposit
} from '../../../../components/platform/InvestorFundingClient'
import { createClient } from '../../../../lib/supabase/server'

type PageProps = {
  params: Promise<{
    reference: string
  }>
}

type RawApplication = {
  id: string
  amount: number | string
  status: string
  reference_code: string
  opportunity: {
    title: string
    minimum_investment: number | string
  } | null
}

type RawWallet = {
  id: string
  asset: 'BTC' | 'USDT'
  network: string
  address: string
  display_name: string
  instructions: string
}

type RawDeposit = {
  id: string
  asset: string
  network: string
  asset_amount: number | string
  declared_usd_amount: number | string | null
  transaction_hash: string
  status: string
  credited_usd_amount: number | string | null
  submitted_at: string
}

export default async function InvestorFundingPage({
  params
}: PageProps) {
  const { reference } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  const destination =
    `/dashboard/funding/${encodeURIComponent(reference)}`

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(destination)}`
    )
  }

  const { data: applicationData, error: applicationError } =
    await supabase
      .from('investment_applications')
      .select(`
        id,
        amount,
        status,
        reference_code,
        opportunity:opportunities (
          title,
          minimum_investment
        )
      `)
      .eq('reference_code', reference)
      .eq('user_id', user.id)
      .maybeSingle()

  if (applicationError || !applicationData) {
    notFound()
  }

  const application =
    applicationData as unknown as RawApplication

  if (application.status !== 'approved') {
    redirect(
      `/dashboard/applications/${encodeURIComponent(
        reference
      )}`
    )
  }

  const [walletResult, depositResult] =
    await Promise.all([
      supabase
        .from('funding_wallets')
        .select(`
          id,
          asset,
          network,
          address,
          display_name,
          instructions
        `)
        .eq('is_active', true)
        .eq('environment', 'sandbox')
        .order('asset', { ascending: true }),

      supabase
        .from('investor_deposits')
        .select(`
          id,
          asset,
          network,
          asset_amount,
          declared_usd_amount,
          transaction_hash,
          status,
          credited_usd_amount,
          submitted_at
        `)
        .eq('application_id', application.id)
        .eq('investor_user_id', user.id)
        .order('submitted_at', { ascending: false })
    ])

  if (walletResult.error) {
    throw new Error(
      `Unable to load funding wallets: ${walletResult.error.message}`
    )
  }

  if (depositResult.error) {
    throw new Error(
      `Unable to load funding history: ${depositResult.error.message}`
    )
  }

  const wallets: FundingWallet[] = (
    (walletResult.data ?? []) as RawWallet[]
  ).map((wallet) => ({
    id: wallet.id,
    asset: wallet.asset,
    network: wallet.network,
    address: wallet.address,
    displayName: wallet.display_name,
    instructions: wallet.instructions
  }))

  const deposits: InvestorDeposit[] = (
    (depositResult.data ?? []) as RawDeposit[]
  ).map((deposit) => ({
    id: deposit.id,
    asset: deposit.asset,
    network: deposit.network,
    assetAmount: Number(deposit.asset_amount),
    declaredUsdAmount:
      deposit.declared_usd_amount === null
        ? null
        : Number(deposit.declared_usd_amount),
    transactionHash: deposit.transaction_hash,
    status: deposit.status,
    creditedUsdAmount:
      deposit.credited_usd_amount === null
        ? null
        : Number(deposit.credited_usd_amount),
    submittedAt: deposit.submitted_at
  }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <InvestorFundingClient
        applicationId={application.id}
        referenceCode={application.reference_code}
        opportunityTitle={
          application.opportunity?.title ??
          'Approved Investment'
        }
        approvedTarget={Number(application.amount)}
        minimumInvestment={Number(
          application.opportunity?.minimum_investment ?? 0
        )}
        wallets={wallets}
        initialDeposits={deposits}
      />

      <PlatformFooter />
    </main>
  )
}
