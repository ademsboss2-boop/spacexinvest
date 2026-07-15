import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import FinanceWithdrawalClient, {
  type FinanceWithdrawalRequest
} from '../../../components/platform/FinanceWithdrawalClient'
import { createClient } from '../../../lib/supabase/server'

type RawFinanceWithdrawalRequest = {
  request_id: string
  request_reference: string

  position_id: string
  application_id: string
  application_reference: string

  investor_user_id: string
  investor_email: string
  investor_display_name: string

  opportunity_title: string

  request_type: string
  payout_asset: string
  payout_network: string
  wallet_address: string

  requested_capital: number | string
  requested_profit: number | string
  requested_total: number | string

  approved_capital: number | string | null
  approved_profit: number | string | null
  approved_total: number | string | null

  status: string
  investor_note: string | null
  finance_note: string | null
  transaction_reference: string | null

  reviewed_at: string | null
  processing_started_at: string | null
  completed_at: string | null

  created_at: string
  updated_at: string
}

function amount(value: number | string | null) {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export default async function FinanceWithdrawalProcessingPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(
        '/admin/withdrawal-processing'
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
        '/admin/withdrawal-processing'
      )}`
    )
  }

  const { data, error } = await supabase.rpc(
    'list_finance_withdrawal_requests',
    {
      p_status: null,
      p_limit: 200
    }
  )

  if (error) {
    throw new Error(
      `Unable to load finance withdrawal requests: ${error.message}`
    )
  }

  const requests: FinanceWithdrawalRequest[] = (
    (data ?? []) as RawFinanceWithdrawalRequest[]
  ).map((request) => ({
    requestId: request.request_id,
    requestReference: request.request_reference,

    positionId: request.position_id,
    applicationId: request.application_id,
    applicationReference:
      request.application_reference,

    investorUserId: request.investor_user_id,
    investorEmail: request.investor_email,
    investorDisplayName:
      request.investor_display_name,

    opportunityTitle: request.opportunity_title,

    requestType:
      request.request_type === 'full_exit'
        ? 'full_exit'
        : 'profit_only',

    payoutAsset:
      request.payout_asset === 'BTC'
        ? 'BTC'
        : 'USDT',

    payoutNetwork:
      request.payout_network === 'BITCOIN_TESTNET'
        ? 'BITCOIN_TESTNET'
        : 'TRON_TESTNET_TRC20',

    walletAddress: request.wallet_address,

    requestedCapital:
      amount(request.requested_capital),

    requestedProfit:
      amount(request.requested_profit),

    requestedTotal:
      amount(request.requested_total),

    approvedCapital:
      amount(request.approved_capital),

    approvedProfit:
      amount(request.approved_profit),

    approvedTotal:
      amount(request.approved_total),

    status:
      request.status === 'completed'
        ? 'completed'
        : request.status === 'processing'
          ? 'processing'
          : 'approved',

    investorNote: request.investor_note,
    financeNote: request.finance_note,
    transactionReference:
      request.transaction_reference,

    reviewedAt: request.reviewed_at,
    processingStartedAt:
      request.processing_started_at,
    completedAt: request.completed_at,

    createdAt: request.created_at,
    updatedAt: request.updated_at
  }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <FinanceWithdrawalClient
        initialRequests={requests}
      />

      <PlatformFooter />
    </main>
  )
}
