import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import AdminFinanceClient, {
  type FinanceDeposit,
  type FinanceWallet
} from '../../../components/platform/AdminFinanceClient'
import { createClient } from '../../../lib/supabase/server'

type RawWallet = {
  id: string
  asset: 'BTC' | 'USDT'
  network: string
  address: string
  display_name: string
  instructions: string
  is_active: boolean
  environment: string
  created_at: string
  updated_at: string
}

type RawFinanceDeposit = {
  deposit_id: string
  application_id: string
  application_reference: string

  investor_user_id: string
  investor_email: string
  investor_display_name: string

  opportunity_title: string
  approved_target: number | string
  minimum_investment: number | string

  asset: string
  network: string
  wallet_address_snapshot: string
  asset_amount: number | string
  declared_usd_amount: number | string | null
  transaction_hash: string

  deposit_status: string
  credited_usd_amount: number | string | null

  investor_note: string | null
  finance_note: string | null

  submitted_at: string
  reviewed_at: string | null
}

export default async function FinancePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(
        '/admin/finance'
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
    if (staffRole?.role === 'reviewer') {
      redirect('/admin/applications')
    }

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
        '/admin/finance'
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
          instructions,
          is_active,
          environment,
          created_at,
          updated_at
        `)
        .eq('environment', 'sandbox')
        .order('updated_at', {
          ascending: false
        }),

      supabase.rpc('list_finance_deposits', {
        p_status: null,
        p_limit: 200
      })
    ])

  if (walletResult.error) {
    throw new Error(
      `Unable to load funding wallets: ${walletResult.error.message}`
    )
  }

  if (depositResult.error) {
    throw new Error(
      `Unable to load finance deposits: ${depositResult.error.message}`
    )
  }

  const wallets: FinanceWallet[] = (
    (walletResult.data ?? []) as RawWallet[]
  ).map((wallet) => ({
    id: wallet.id,
    asset: wallet.asset,
    network: wallet.network,
    address: wallet.address,
    displayName: wallet.display_name,
    instructions: wallet.instructions,
    isActive: wallet.is_active,
    environment: wallet.environment,
    createdAt: wallet.created_at,
    updatedAt: wallet.updated_at
  }))

  const deposits: FinanceDeposit[] = (
    (depositResult.data ??
      []) as RawFinanceDeposit[]
  ).map((deposit) => ({
    depositId: deposit.deposit_id,
    applicationId: deposit.application_id,
    applicationReference:
      deposit.application_reference,

    investorUserId: deposit.investor_user_id,
    investorEmail: deposit.investor_email,
    investorDisplayName:
      deposit.investor_display_name,

    opportunityTitle: deposit.opportunity_title,
    approvedTarget: Number(
      deposit.approved_target
    ),
    minimumInvestment: Number(
      deposit.minimum_investment
    ),

    asset: deposit.asset,
    network: deposit.network,
    walletAddressSnapshot:
      deposit.wallet_address_snapshot,
    assetAmount: Number(deposit.asset_amount),
    declaredUsdAmount:
      deposit.declared_usd_amount === null
        ? null
        : Number(deposit.declared_usd_amount),
    transactionHash: deposit.transaction_hash,

    depositStatus: deposit.deposit_status,
    creditedUsdAmount:
      deposit.credited_usd_amount === null
        ? null
        : Number(deposit.credited_usd_amount),

    investorNote: deposit.investor_note,
    financeNote: deposit.finance_note,

    submittedAt: deposit.submitted_at,
    reviewedAt: deposit.reviewed_at
  }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <AdminFinanceClient
        initialWallets={wallets}
        initialDeposits={deposits}
      />

      <PlatformFooter />
    </main>
  )
}
