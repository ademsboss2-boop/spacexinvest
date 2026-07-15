'use client'

import React, {
  useEffect,
  useMemo,
  useState
} from 'react'
import {
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { requestInvestorNotification } from '../../lib/email/request-investor-notification'

export type FinanceWithdrawalStatus =
  | 'approved'
  | 'processing'
  | 'completed'

export type FinanceWithdrawalRequest = {
  requestId: string
  requestReference: string

  positionId: string
  applicationId: string
  applicationReference: string

  investorUserId: string
  investorEmail: string
  investorDisplayName: string

  opportunityTitle: string

  requestType: 'profit_only' | 'full_exit'
  payoutAsset: 'BTC' | 'USDT'
  payoutNetwork:
    | 'BITCOIN_TESTNET'
    | 'TRON_TESTNET_TRC20'
  walletAddress: string

  requestedCapital: number
  requestedProfit: number
  requestedTotal: number

  approvedCapital: number
  approvedProfit: number
  approvedTotal: number

  status: FinanceWithdrawalStatus

  investorNote: string | null
  financeNote: string | null
  transactionReference: string | null

  reviewedAt: string | null
  processingStartedAt: string | null
  completedAt: string | null

  createdAt: string
  updatedAt: string
}

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

type Props = {
  initialRequests: FinanceWithdrawalRequest[]
}

const STATUS_OPTIONS: Array<{
  value: 'all' | FinanceWithdrawalStatus
  label: string
}> = [
  { value: 'all', label: 'All finance requests' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' }
]

function amount(value: number | string | null) {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function normalize(
  rows: RawFinanceWithdrawalRequest[]
): FinanceWithdrawalRequest[] {
  return rows.map((request) => ({
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
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

function statusLabel(value: string) {
  return value
    .split('_')
    .map((part) =>
      part.charAt(0).toUpperCase() +
      part.slice(1)
    )
    .join(' ')
}

function requestTypeLabel(
  value: FinanceWithdrawalRequest['requestType']
) {
  return value === 'full_exit'
    ? 'Full exit'
    : 'Realized profit only'
}

function networkLabel(
  value: FinanceWithdrawalRequest['payoutNetwork']
) {
  return value === 'BITCOIN_TESTNET'
    ? 'Bitcoin testnet'
    : 'TRON testnet TRC20'
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export default function FinanceWithdrawalClient({
  initialRequests
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [requests, setRequests] =
    useState(initialRequests)

  const [statusFilter, setStatusFilter] =
    useState<'all' | FinanceWithdrawalStatus>('all')

  const [selectedRequestId, setSelectedRequestId] =
    useState(initialRequests[0]?.requestId ?? '')

  const [financeNote, setFinanceNote] =
    useState('')

  const [transactionReference, setTransactionReference] =
    useState('')

  const [effectiveDate, setEffectiveDate] =
    useState(todayIsoDate())

  const [workingAction, setWorkingAction] =
    useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const filteredRequests = useMemo(
    () =>
      statusFilter === 'all'
        ? requests
        : requests.filter(
            (request) =>
              request.status === statusFilter
          ),
    [requests, statusFilter]
  )

  const selectedRequest = requests.find(
    (request) =>
      request.requestId === selectedRequestId
  )

  useEffect(() => {
    if (!selectedRequest) {
      return
    }

    setFinanceNote(
      selectedRequest.financeNote ?? ''
    )

    setTransactionReference(
      selectedRequest.transactionReference ?? ''
    )

    setEffectiveDate(
      selectedRequest.completedAt
        ? selectedRequest.completedAt.slice(0, 10)
        : todayIsoDate()
    )

    setCopied(false)
  }, [selectedRequest])

  useEffect(() => {
    if (
      filteredRequests.length > 0 &&
      !filteredRequests.some(
        (request) =>
          request.requestId === selectedRequestId
      )
    ) {
      setSelectedRequestId(
        filteredRequests[0].requestId
      )
    }
  }, [filteredRequests, selectedRequestId])

  const totals = useMemo(
    () =>
      requests.reduce(
        (summary, request) => ({
          approved:
            summary.approved +
            (request.status === 'approved' ? 1 : 0),

          processing:
            summary.processing +
            (request.status === 'processing' ? 1 : 0),

          completed:
            summary.completed +
            (request.status === 'completed' ? 1 : 0),

          approvedValue:
            summary.approvedValue +
            (request.status === 'approved'
              ? request.approvedTotal
              : 0)
        }),
        {
          approved: 0,
          processing: 0,
          completed: 0,
          approvedValue: 0
        }
      ),
    [requests]
  )

  async function reloadRequests() {
    const { data, error: reloadError } =
      await supabase.rpc(
        'list_finance_withdrawal_requests',
        {
          p_status: null,
          p_limit: 200
        }
      )

    if (reloadError) {
      throw new Error(reloadError.message)
    }

    const nextRequests = normalize(
      (data ?? []) as RawFinanceWithdrawalRequest[]
    )

    setRequests(nextRequests)

    if (
      selectedRequestId &&
      !nextRequests.some(
        (request) =>
          request.requestId === selectedRequestId
      )
    ) {
      setSelectedRequestId(
        nextRequests[0]?.requestId ?? ''
      )
    }
  }

  async function runAction(
    action: string,
    callback: () => Promise<void>
  ) {
    setWorkingAction(action)
    setMessage('')
    setError('')

    try {
      await callback()
      await reloadRequests()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The finance withdrawal action could not be completed.'
      )
    } finally {
      setWorkingAction(null)
    }
  }

  async function copyWalletAddress() {
    if (!selectedRequest) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        selectedRequest.walletAddress
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setError(
        'The testnet wallet address could not be copied.'
      )
    }
  }

  async function beginProcessing() {
    if (!selectedRequest) {
      setError('Select an approved withdrawal request.')
      return
    }

    if (selectedRequest.status !== 'approved') {
      setError(
        'Only an approved withdrawal can begin processing.'
      )
      return
    }

    const confirmed = window.confirm(
      `Begin manual testnet processing for ${selectedRequest.requestReference}?`
    )

    if (!confirmed) {
      return
    }

    await runAction('processing', async () => {
      const { error: processingError } =
        await supabase.rpc(
          'mark_withdrawal_processing',
          {
            p_request_id:
              selectedRequest.requestId,

            p_finance_note:
              financeNote.trim() || null
          }
        )

      if (processingError) {
        throw new Error(processingError.message)
      }

      const notificationSent =
        await requestInvestorNotification(
          'withdrawal_processing',
          selectedRequest.requestId
        )

      setMessage(
        notificationSent
          ? 'The withdrawal is marked as processing, and the investor notification email was sent. Complete the separate approved testnet action before recording its reference.'
          : 'The withdrawal is marked as processing. The status was saved, but the investor notification email could not be sent. Complete the separate approved testnet action before recording its reference.'
      )
    })
  }

  async function completeWithdrawal() {
    if (!selectedRequest) {
      setError('Select a processing withdrawal request.')
      return
    }

    if (selectedRequest.status !== 'processing') {
      setError(
        'Only a processing withdrawal can be completed.'
      )
      return
    }

    const trimmedReference =
      transactionReference.trim()

    if (trimmedReference.length < 6) {
      setError(
        'Enter a manual testnet transaction reference containing at least 6 characters.'
      )
      return
    }

    if (!effectiveDate) {
      setError('Select an effective date.')
      return
    }

    if (effectiveDate > todayIsoDate()) {
      setError(
        'The effective date cannot be in the future.'
      )
      return
    }

    const confirmed = window.confirm(
      `Record ${selectedRequest.requestReference} as completed using the entered testnet reference? This updates portfolio accounting.`
    )

    if (!confirmed) {
      return
    }

    await runAction('completed', async () => {
      const { error: completionError } =
        await supabase.rpc(
          'complete_investor_withdrawal',
          {
            p_request_id:
              selectedRequest.requestId,

            p_transaction_reference:
              trimmedReference,

            p_finance_note:
              financeNote.trim() || null,

            p_effective_date: effectiveDate
          }
        )

      if (completionError) {
        throw new Error(completionError.message)
      }

      const notificationSent =
        await requestInvestorNotification(
          'withdrawal_completed',
          selectedRequest.requestId
        )

      setMessage(
        notificationSent
          ? 'The testnet withdrawal reference and accounting completion were recorded, and the investor notification email was sent.'
          : 'The testnet withdrawal reference and accounting completion were recorded. The completion remains saved, but the investor notification email could not be sent.'
      )
    })
  }

  return (
    <div className="bg-[#030303] pb-20">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
            <ShieldCheck size={16} />
            MFA-Protected Finance Workspace
          </div>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold uppercase tracking-[-0.045em] text-white sm:text-6xl">
                Withdrawal
                <span className="block text-white/40">
                  Processing
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">
                Process administrator-approved withdrawal
                requests using approved testnet workflows
                only. This console never signs or sends a
                transaction. It records workflow status,
                a manual test reference, and portfolio
                accounting after the separate test action
                is complete.
              </p>
            </div>

            <button
              type="button"
              disabled={workingAction !== null}
              onClick={() =>
                runAction('refresh', reloadRequests)
              }
              className="btn btn-ghost min-h-12 gap-2"
            >
              <RefreshCw
                size={16}
                className={
                  workingAction === 'refresh'
                    ? 'animate-spin'
                    : ''
                }
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="border border-amber-300/15 bg-amber-300/[0.04] p-5 text-sm leading-6 text-amber-100/70">
          <strong className="text-amber-100">
            Testnet-only control:
          </strong>{' '}
          never use mainnet funds, seed phrases, private
          keys, or automated signing in this workspace.
          The administrator who approved a request cannot
          process or complete that same request.
        </section>

        <section className="mt-6 grid border border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Approved Queue', String(totals.approved)],
            ['Processing', String(totals.processing)],
            ['Completed', String(totals.completed)],
            [
              'Approved Value',
              currency(totals.approvedValue)
            ]
          ].map(([label, value]) => (
            <article
              key={label}
              className="min-h-36 border-b border-r border-white/10 bg-white/[0.025] p-6"
            >
              <p className="text-xs uppercase tracking-[0.15em] text-white/35">
                {label}
              </p>

              <p className="mt-7 text-2xl font-semibold text-white">
                {value}
              </p>
            </article>
          ))}
        </section>

        {error ? (
          <div className="mt-6 flex gap-3 border border-red-300/15 bg-red-300/[0.05] p-4 text-sm text-red-100/75">
            <XCircle size={17} />
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 flex gap-3 border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-sm text-emerald-100/75">
            <CheckCircle2 size={17} />
            {message}
          </div>
        ) : null}

        <section className="mt-6 border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-white/35">
                Finance Queue
              </p>

              <p className="mt-2 text-sm text-white/45">
                {filteredRequests.length} request
                {filteredRequests.length === 1 ? '' : 's'}
              </p>
            </div>

            <label className="w-full md:max-w-xs">
              <span className="text-xs uppercase tracking-[0.15em] text-white/35">
                Status Filter
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | 'all'
                      | FinanceWithdrawalStatus
                  )
                }
                className="mt-2 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {filteredRequests.length === 0 ? (
          <section className="mt-6 border border-white/10 bg-white/[0.025] p-10 text-center">
            <WalletCards
              size={28}
              className="mx-auto text-white/30"
            />

            <p className="mt-4 text-sm text-white/50">
              No finance withdrawal requests match this filter.
            </p>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <section className="space-y-3">
              {filteredRequests.map((request) => {
                const selected =
                  request.requestId === selectedRequestId

                return (
                  <button
                    key={request.requestId}
                    type="button"
                    onClick={() =>
                      setSelectedRequestId(
                        request.requestId
                      )
                    }
                    className={[
                      'w-full border p-5 text-left transition-colors',
                      selected
                        ? 'border-white/35 bg-white/[0.07]'
                        : 'border-white/10 bg-white/[0.025] hover:border-white/20'
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/35">
                          {request.requestReference}
                        </p>

                        <p className="mt-2 font-medium text-white">
                          {request.investorDisplayName}
                        </p>

                        <p className="mt-1 text-sm text-white/45">
                          {request.opportunityTitle}
                        </p>
                      </div>

                      <span className="border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/55">
                        {statusLabel(request.status)}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between text-sm">
                      <span className="text-white/40">
                        {requestTypeLabel(
                          request.requestType
                        )}
                      </span>

                      <span className="font-medium text-white">
                        {currency(request.approvedTotal)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </section>

            {selectedRequest ? (
              <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 md:flex-row">
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/35">
                      Selected Request
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      {selectedRequest.requestReference}
                    </h2>

                    <p className="mt-2 text-sm text-white/45">
                      Application{' '}
                      {selectedRequest.applicationReference}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Clock3 size={16} />
                    {formatDate(
                      selectedRequest.reviewedAt
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    [
                      'Investor',
                      selectedRequest.investorDisplayName
                    ],
                    [
                      'Investor Email',
                      selectedRequest.investorEmail
                    ],
                    [
                      'Request Type',
                      requestTypeLabel(
                        selectedRequest.requestType
                      )
                    ],
                    [
                      'Payout',
                      `${selectedRequest.payoutAsset} · ${networkLabel(
                        selectedRequest.payoutNetwork
                      )}`
                    ],
                    [
                      'Status',
                      statusLabel(selectedRequest.status)
                    ],
                    [
                      'Approved Total',
                      currency(
                        selectedRequest.approvedTotal
                      )
                    ]
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="border border-white/10 bg-black/30 p-4"
                    >
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                        {label}
                      </p>

                      <p className="mt-2 break-all text-sm text-white/70">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid border border-white/10 sm:grid-cols-3">
                  {[
                    [
                      'Approved Capital',
                      selectedRequest.approvedCapital
                    ],
                    [
                      'Approved Profit',
                      selectedRequest.approvedProfit
                    ],
                    [
                      'Approved Total',
                      selectedRequest.approvedTotal
                    ]
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="border-b border-r border-white/10 p-5"
                    >
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                        {label}
                      </p>

                      <p className="mt-3 text-lg font-medium text-white">
                        {currency(Number(value))}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border border-amber-300/15 bg-black/40 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-amber-100/45">
                        Approved Testnet Payout Address
                      </p>

                      <p className="mt-3 break-all font-mono text-sm leading-6 text-white/80">
                        {selectedRequest.walletAddress}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copyWalletAddress}
                      className="btn btn-ghost min-h-11 shrink-0 gap-2"
                    >
                      <Copy size={15} />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {selectedRequest.investorNote ? (
                  <div className="mt-6 border border-white/10 bg-black/30 p-5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                      Investor Note
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/60">
                      {selectedRequest.investorNote}
                    </p>
                  </div>
                ) : null}

                <label className="mt-6 block">
                  <span className="text-xs uppercase tracking-[0.14em] text-white/35">
                    Private Finance Note
                  </span>

                  <textarea
                    value={financeNote}
                    onChange={(event) =>
                      setFinanceNote(
                        event.target.value
                      )
                    }
                    maxLength={2000}
                    rows={4}
                    placeholder="Internal note only. Never paste private keys, seed phrases, or signing material."
                    className="mt-2 w-full border border-white/10 bg-black p-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/35"
                  />
                </label>

                {selectedRequest.status === 'processing' ? (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className="text-xs uppercase tracking-[0.14em] text-white/35">
                        Manual Testnet Reference
                      </span>

                      <input
                        value={transactionReference}
                        onChange={(event) =>
                          setTransactionReference(
                            event.target.value
                          )
                        }
                        maxLength={200}
                        placeholder="TESTNET-REFERENCE-..."
                        className="mt-2 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/35"
                      />
                    </label>

                    <label>
                      <span className="text-xs uppercase tracking-[0.14em] text-white/35">
                        Effective Date
                      </span>

                      <input
                        type="date"
                        max={todayIsoDate()}
                        value={effectiveDate}
                        onChange={(event) =>
                          setEffectiveDate(
                            event.target.value
                          )
                        }
                        className="mt-2 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
                      />
                    </label>
                  </div>
                ) : null}

                {selectedRequest.status === 'approved' ? (
                  <button
                    type="button"
                    disabled={workingAction !== null}
                    onClick={beginProcessing}
                    className="btn btn-primary mt-6 min-h-12 w-full gap-2"
                  >
                    {workingAction === 'processing' ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : null}
                    Begin Manual Testnet Processing
                  </button>
                ) : null}

                {selectedRequest.status === 'processing' ? (
                  <button
                    type="button"
                    disabled={workingAction !== null}
                    onClick={completeWithdrawal}
                    className="btn btn-primary mt-6 min-h-12 w-full gap-2"
                  >
                    {workingAction === 'completed' ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : null}
                    Record Testnet Completion
                  </button>
                ) : null}

                {selectedRequest.status === 'completed' ? (
                  <div className="mt-6 border border-emerald-300/15 bg-emerald-300/[0.04] p-5 text-sm text-emerald-100/70">
                    <p className="font-medium text-emerald-100">
                      Completion recorded
                    </p>

                    <p className="mt-2">
                      Reference:{' '}
                      <span className="break-all font-mono">
                        {selectedRequest.transactionReference ??
                          'Not available'}
                      </span>
                    </p>

                    <p className="mt-2">
                      Completed:{' '}
                      {formatDate(
                        selectedRequest.completedAt
                      )}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
