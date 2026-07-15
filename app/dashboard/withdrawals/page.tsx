import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import InvestorWithdrawalClient, {
  type InvestorWithdrawalPosition,
  type InvestorWithdrawalRequest
} from '../../../components/platform/InvestorWithdrawalClient'
import { createClient } from '../../../lib/supabase/server'

type RawWithdrawalPosition = {
  position_id: string
  application_id: string
  application_reference: string
  opportunity_title: string
  portfolio_status: string
  remaining_capital: number | string
  available_profit: number | string
  has_open_request: boolean
  open_request_id: string | null
  open_request_reference: string | null
  open_request_type: string | null
  open_request_status: string | null
  open_request_created_at: string | null
}

type RawWithdrawalRequest = {
  request_id: string
  request_reference: string
  position_id: string
  application_id: string
  application_reference: string
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
  approved_total: number | string
  status: string
  investor_note: string | null
  investor_message: string | null
  transaction_reference: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  processing_started_at: string | null
  completed_at: string | null
}

function amount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export default async function InvestorWithdrawalsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(
        '/dashboard/withdrawals'
      )}`
    )
  }

  const [positionsResult, requestsResult] =
    await Promise.all([
      supabase.rpc('list_investor_withdrawal_positions'),
      supabase.rpc('list_investor_withdrawal_requests', {
        p_limit: 100
      })
    ])

  if (positionsResult.error) {
    throw new Error(
      `Unable to load withdrawal balances: ${positionsResult.error.message}`
    )
  }

  if (requestsResult.error) {
    throw new Error(
      `Unable to load withdrawal history: ${requestsResult.error.message}`
    )
  }

  const positions: InvestorWithdrawalPosition[] = (
    (positionsResult.data ?? []) as RawWithdrawalPosition[]
  ).map((position) => ({
    positionId: position.position_id,
    applicationId: position.application_id,
    applicationReference: position.application_reference,
    opportunityTitle: position.opportunity_title,
    portfolioStatus: position.portfolio_status,
    remainingCapital: amount(position.remaining_capital),
    availableProfit: amount(position.available_profit),
    hasOpenRequest: Boolean(position.has_open_request),
    openRequestId: position.open_request_id,
    openRequestReference: position.open_request_reference,
    openRequestType: position.open_request_type,
    openRequestStatus: position.open_request_status,
    openRequestCreatedAt: position.open_request_created_at
  }))

  const requests: InvestorWithdrawalRequest[] = (
    (requestsResult.data ?? []) as RawWithdrawalRequest[]
  ).map((request) => ({
    requestId: request.request_id,
    requestReference: request.request_reference,
    positionId: request.position_id,
    applicationId: request.application_id,
    applicationReference: request.application_reference,
    opportunityTitle: request.opportunity_title,
    requestType: request.request_type,
    payoutAsset: request.payout_asset,
    payoutNetwork: request.payout_network,
    walletAddress: request.wallet_address,
    requestedCapital: amount(request.requested_capital),
    requestedProfit: amount(request.requested_profit),
    requestedTotal: amount(request.requested_total),
    approvedCapital:
      request.approved_capital === null
        ? null
        : amount(request.approved_capital),
    approvedProfit:
      request.approved_profit === null
        ? null
        : amount(request.approved_profit),
    approvedTotal: amount(request.approved_total),
    status: request.status,
    investorNote: request.investor_note,
    investorMessage: request.investor_message,
    transactionReference: request.transaction_reference,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    reviewedAt: request.reviewed_at,
    processingStartedAt: request.processing_started_at,
    completedAt: request.completed_at
  }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <InvestorWithdrawalClient
        positions={positions}
        requests={requests}
      />

      <PlatformFooter />
    </main>
  )
}
