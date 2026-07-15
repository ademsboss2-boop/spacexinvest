'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  ShieldCheck,
  WalletCards,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { requestInvestorNotification } from '../../lib/email/request-investor-notification'

export type InvestorWithdrawalPosition = {
  positionId: string
  applicationId: string
  applicationReference: string
  opportunityTitle: string
  portfolioStatus: string
  remainingCapital: number
  availableProfit: number
  hasOpenRequest: boolean
  openRequestId: string | null
  openRequestReference: string | null
  openRequestType: string | null
  openRequestStatus: string | null
  openRequestCreatedAt: string | null
}

export type InvestorWithdrawalRequest = {
  requestId: string
  requestReference: string
  positionId: string
  applicationId: string
  applicationReference: string
  opportunityTitle: string
  requestType: string
  payoutAsset: string
  payoutNetwork: string
  walletAddress: string
  requestedCapital: number
  requestedProfit: number
  requestedTotal: number
  approvedCapital: number | null
  approvedProfit: number | null
  approvedTotal: number
  status: string
  investorNote: string | null
  investorMessage: string | null
  transactionReference: string | null
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
  processingStartedAt: string | null
  completedAt: string | null
}

type Props = {
  positions: InvestorWithdrawalPosition[]
  requests: InvestorWithdrawalRequest[]
}

type RequestType = 'realized_profit' | 'full_exit'
type PayoutAsset = 'USDT' | 'BTC'

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return 'Not recorded'

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

function statusClasses(status: string) {
  switch (status) {
    case 'completed':
      return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'

    case 'rejected':
    case 'cancelled':
      return 'border-red-300/20 bg-red-300/10 text-red-100'

    case 'approved':
    case 'processing':
      return 'border-sky-300/20 bg-sky-300/10 text-sky-100'

    default:
      return 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  }
}

function validateWallet(asset: PayoutAsset, address: string) {
  const trimmed = address.trim()

  if (!trimmed) {
    return 'Enter a testnet wallet address.'
  }

  if (/\s/.test(trimmed)) {
    return 'The wallet address cannot contain spaces.'
  }

  if (asset === 'USDT') {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed)
      ? ''
      : 'Enter a valid TRON TRC20 wallet address.'
  }

  const legacyTestnet = /^[mn2][1-9A-HJ-NP-Za-km-z]{25,39}$/
  const bech32Testnet = /^tb1[ac-hj-np-z02-9]{11,87}$/i

  return legacyTestnet.test(trimmed) ||
    bech32Testnet.test(trimmed)
    ? ''
    : 'Enter a valid Bitcoin wallet address.'
}

function maskWallet(address: string) {
  if (address.length < 14) return address
  return `${address.slice(0, 7)}...${address.slice(-7)}`
}

export default function InvestorWithdrawalClient({
  positions,
  requests
}: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const firstEligiblePosition = positions.find(
    (position) =>
      position.portfolioStatus === 'active' &&
      !position.hasOpenRequest &&
      (position.remainingCapital > 0 ||
        position.availableProfit > 0)
  )

  const [selectedPositionId, setSelectedPositionId] =
    useState(firstEligiblePosition?.positionId ?? '')
  const [requestType, setRequestType] =
    useState<RequestType>(
      firstEligiblePosition?.availableProfit
        ? 'realized_profit'
        : 'full_exit'
    )
  const [payoutAsset, setPayoutAsset] =
    useState<PayoutAsset>('USDT')
  const [walletAddress, setWalletAddress] = useState('')
  const [profitAmount, setProfitAmount] = useState(
    firstEligiblePosition?.availableProfit
      ? String(firstEligiblePosition.availableProfit)
      : ''
  )
  const [investorNote, setInvestorNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] =
    useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedPosition = positions.find(
    (position) => position.positionId === selectedPositionId
  )

  const parsedProfitAmount = Number(profitAmount)

  const calculatedTotal =
    requestType === 'full_exit'
      ? (selectedPosition?.remainingCapital ?? 0) +
        (selectedPosition?.availableProfit ?? 0)
      : Number.isFinite(parsedProfitAmount)
        ? parsedProfitAmount
        : 0

  const openRequests = requests.filter((request) =>
    ['submitted', 'under_review', 'approved', 'processing'].includes(
      request.status
    )
  )

  const completedTotal = requests
    .filter((request) => request.status === 'completed')
    .reduce(
      (total, request) =>
        total +
        (request.approvedTotal > 0
          ? request.approvedTotal
          : request.requestedTotal),
      0
    )

  function handlePositionChange(positionId: string) {
    setSelectedPositionId(positionId)
    setErrorMessage('')
    setSuccessMessage('')

    const nextPosition = positions.find(
      (position) => position.positionId === positionId
    )

    if (!nextPosition) return

    if (nextPosition.availableProfit > 0) {
      setRequestType('realized_profit')
      setProfitAmount(String(nextPosition.availableProfit))
    } else {
      setRequestType('full_exit')
      setProfitAmount('')
    }
  }

  function handleRequestTypeChange(nextType: RequestType) {
    setRequestType(nextType)
    setErrorMessage('')
    setSuccessMessage('')

    if (nextType === 'realized_profit') {
      setProfitAmount(
        selectedPosition?.availableProfit
          ? String(selectedPosition.availableProfit)
          : ''
      )
    } else {
      setProfitAmount('')
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!selectedPosition) {
      setErrorMessage('Select an eligible portfolio position.')
      return
    }

    if (
      selectedPosition.portfolioStatus !== 'active' ||
      selectedPosition.hasOpenRequest
    ) {
      setErrorMessage(
        'This portfolio position is not currently eligible for a new request.'
      )
      return
    }

    if (requestType === 'realized_profit') {
      if (
        !Number.isFinite(parsedProfitAmount) ||
        parsedProfitAmount <= 0
      ) {
        setErrorMessage(
          'Enter a realized-profit amount greater than zero.'
        )
        return
      }

      if (parsedProfitAmount > selectedPosition.availableProfit) {
        setErrorMessage(
          'The amount exceeds the available realized profit.'
        )
        return
      }
    }

    if (requestType === 'full_exit' && calculatedTotal <= 0) {
      setErrorMessage(
        'No capital or realized profit is available for a full exit.'
      )
      return
    }

    const walletError = validateWallet(
      payoutAsset,
      walletAddress
    )

    if (walletError) {
      setErrorMessage(walletError)
      return
    }

    if (investorNote.trim().length > 1000) {
      setErrorMessage('The note cannot exceed 1,000 characters.')
      return
    }

    setSubmitting(true)

    try {
      const {
        data: requestId,
        error
      } = await supabase.rpc(
        'submit_investor_withdrawal',
        {
          p_position_id: selectedPosition.positionId,
          p_request_type: requestType,
          p_payout_asset: payoutAsset,
          p_wallet_address: walletAddress.trim(),
          p_profit_amount:
            requestType === 'realized_profit'
              ? parsedProfitAmount
              : null,
          p_investor_note:
            investorNote.trim() || null
        }
      )

      if (error) {
        setErrorMessage(error.message)
        return
      }

      const notificationSent =
        typeof requestId === 'string' &&
        await requestInvestorNotification(
          'withdrawal_submitted',
          requestId
        )

      setSuccessMessage(
        notificationSent
          ? 'Your withdrawal request was submitted for administrator review, and the notification email was sent.'
          : 'Your withdrawal request was submitted for administrator review. The request is recorded, but the notification email could not be sent.'
      )
      setWalletAddress('')
      setInvestorNote('')
      router.refresh()
    } catch {
      setErrorMessage(
        'The request could not be submitted. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(requestId: string) {
    setErrorMessage('')
    setSuccessMessage('')
    setCancellingId(requestId)

    try {
      const { error } = await supabase.rpc(
        'cancel_investor_withdrawal',
        {
          p_request_id: requestId
        }
      )

      if (error) {
        setErrorMessage(error.message)
        return
      }

      setSuccessMessage('The withdrawal request was cancelled.')
      router.refresh()
    } catch {
      setErrorMessage(
        'The request could not be cancelled. Please try again.'
      )
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="relative overflow-hidden bg-[#030303] pb-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(circle_at_75%_0%,rgba(255,255,255,0.09),transparent_34%),radial-gradient(circle_at_12%_30%,rgba(60,95,130,0.11),transparent_30%)]"
      />

      <section className="relative border-b border-white/10">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Link
            href="/dashboard/portfolio"
            className="inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Portfolio
          </Link>

          <div className="mt-8 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
                <span className="flex h-9 w-9 items-center justify-center border border-white/15 bg-white/[0.03]">
                  <WalletCards size={16} aria-hidden="true" />
                </span>
                Controlled withdrawal workflow
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                Withdrawal
                <span className="block text-white/40">Requests</span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
                Request available realized profit or a full portfolio
                exit. Amounts are calculated and revalidated by the
                database before approval and completion.
              </p>
            </div>

          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-[1380px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section
          aria-label="Withdrawal summary"
          className="grid border border-white/10 sm:grid-cols-3"
        >
          <article className="border-b border-white/10 bg-white/[0.025] p-6 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Eligible Positions
            </p>
            <p className="mt-5 text-3xl font-semibold text-white">
              {
                positions.filter(
                  (position) =>
                    position.portfolioStatus === 'active' &&
                    !position.hasOpenRequest
                ).length
              }
            </p>
          </article>

          <article className="border-b border-white/10 bg-white/[0.025] p-6 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Open Requests
            </p>
            <p className="mt-5 text-3xl font-semibold text-white">
              {openRequests.length}
            </p>
          </article>

          <article className="bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Completed Total
            </p>
            <p className="mt-5 text-3xl font-semibold text-white">
              {currency(completedTotal)}
            </p>
          </article>
        </section>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 border border-red-300/20 bg-red-300/[0.08] p-4 text-sm text-red-100"
          >
            <XCircle size={18} aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 border border-emerald-300/20 bg-emerald-300/[0.08] p-4 text-sm text-emerald-100"
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            <p>{successMessage}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-8">
            <div className="border-b border-white/10 pb-6">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                New Request
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Select a payout instruction
              </h2>
            </div>

            {firstEligiblePosition ? (
              <form onSubmit={handleSubmit} className="mt-7 space-y-6">
                <div>
                  <label
                    htmlFor="withdrawal-position"
                    className="text-sm font-medium text-white"
                  >
                    Portfolio position
                  </label>

                  <select
                    id="withdrawal-position"
                    value={selectedPositionId}
                    onChange={(event) =>
                      handlePositionChange(event.target.value)
                    }
                    className="mt-2 min-h-12 w-full border border-white/15 bg-black/60 px-4 text-sm text-white outline-none focus:border-white/40"
                  >
                    {positions
                      .filter(
                        (position) =>
                          position.portfolioStatus === 'active' &&
                          !position.hasOpenRequest &&
                          (position.remainingCapital > 0 ||
                            position.availableProfit > 0)
                      )
                      .map((position) => (
                        <option
                          key={position.positionId}
                          value={position.positionId}
                        >
                          {position.opportunityTitle} ·{' '}
                          {position.applicationReference}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedPosition ? (
                  <div className="grid border border-white/10 sm:grid-cols-2">
                    <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/35">
                        Remaining capital
                      </p>
                      <p className="mt-2 text-lg font-medium text-white">
                        {currency(selectedPosition.remainingCapital)}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/35">
                        Available realized profit
                      </p>
                      <p className="mt-2 text-lg font-medium text-white">
                        {currency(selectedPosition.availableProfit)}
                      </p>
                    </div>
                  </div>
                ) : null}

                <fieldset>
                  <legend className="text-sm font-medium text-white">
                    Request type
                  </legend>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label
                      className={`cursor-pointer border p-4 transition-colors ${
                        requestType === 'realized_profit'
                          ? 'border-white/40 bg-white/[0.08]'
                          : 'border-white/10 bg-black/30 hover:border-white/25'
                      }`}
                    >
                      <input
                        type="radio"
                        name="request-type"
                        value="realized_profit"
                        checked={requestType === 'realized_profit'}
                        disabled={
                          !selectedPosition ||
                          selectedPosition.availableProfit <= 0
                        }
                        onChange={() =>
                          handleRequestTypeChange('realized_profit')
                        }
                        className="sr-only"
                      />
                      <CircleDollarSign
                        size={20}
                        aria-hidden="true"
                        className="text-white/65"
                      />
                      <p className="mt-4 text-sm font-medium text-white">
                        Realized profit only
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/40">
                        Request part or all of the available realized
                        profit without closing the position.
                      </p>
                    </label>

                    <label
                      className={`cursor-pointer border p-4 transition-colors ${
                        requestType === 'full_exit'
                          ? 'border-white/40 bg-white/[0.08]'
                          : 'border-white/10 bg-black/30 hover:border-white/25'
                      }`}
                    >
                      <input
                        type="radio"
                        name="request-type"
                        value="full_exit"
                        checked={requestType === 'full_exit'}
                        onChange={() =>
                          handleRequestTypeChange('full_exit')
                        }
                        className="sr-only"
                      />
                      <WalletCards
                        size={20}
                        aria-hidden="true"
                        className="text-white/65"
                      />
                      <p className="mt-4 text-sm font-medium text-white">
                        Full portfolio exit
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/40">
                        Request all remaining capital and available
                        realized profit. Completion closes the position.
                      </p>
                    </label>
                  </div>
                </fieldset>

                {requestType === 'realized_profit' ? (
                  <div>
                    <label
                      htmlFor="profit-amount"
                      className="text-sm font-medium text-white"
                    >
                      Profit amount
                    </label>
                    <input
                      id="profit-amount"
                      type="number"
                      min="0.01"
                      max={selectedPosition?.availableProfit ?? 0}
                      step="0.01"
                      value={profitAmount}
                      onChange={(event) =>
                        setProfitAmount(event.target.value)
                      }
                      className="mt-2 min-h-12 w-full border border-white/15 bg-black/60 px-4 text-sm text-white outline-none focus:border-white/40"
                    />
                    <p className="mt-2 text-xs text-white/35">
                      Maximum {currency(selectedPosition?.availableProfit ?? 0)}
                    </p>
                  </div>
                ) : (
                  <div className="border border-white/10 bg-black/30 p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/35">
                      Server-calculated full-exit amount
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {currency(calculatedTotal)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/35">
                      This amount is recalculated during administrator
                      review and again before completion.
                    </p>
                  </div>
                )}

                <fieldset>
                  <legend className="text-sm font-medium text-white">
                    Payout asset
                  </legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(['USDT', 'BTC'] as PayoutAsset[]).map((asset) => (
                      <label
                        key={asset}
                        className={`cursor-pointer border p-4 ${
                          payoutAsset === asset
                            ? 'border-white/40 bg-white/[0.08]'
                            : 'border-white/10 bg-black/30 hover:border-white/25'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payout-asset"
                          value={asset}
                          checked={payoutAsset === asset}
                          onChange={() => {
                            setPayoutAsset(asset)
                            setWalletAddress('')
                          }}
                          className="sr-only"
                        />
                        {asset === 'BTC' ? (
                          <Bitcoin size={20} aria-hidden="true" />
                        ) : (
                          <CircleDollarSign
                            size={20}
                            aria-hidden="true"
                          />
                        )}
                        <p className="mt-3 text-sm font-medium text-white">
                          {asset === 'USDT'
                            ? 'USDT · TRC20'
                            : 'Bitcoin'}
                        </p>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="wallet-address"
                    className="text-sm font-medium text-white"
                  >
                    {payoutAsset === 'USDT'
                      ? 'TRON wallet address'
                      : 'Bitcoin wallet address'}
                  </label>
                  <input
                    id="wallet-address"
                    type="text"
                    value={walletAddress}
                    onChange={(event) =>
                      setWalletAddress(event.target.value)
                    }
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={
                      payoutAsset === 'USDT'
                        ? 'Enter TRON wallet address'
                        : 'Enter Bitcoin wallet address'
                    }
                    className="mt-2 min-h-12 w-full border border-white/15 bg-black/60 px-4 font-mono text-sm text-white outline-none placeholder:text-white/20 focus:border-white/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="investor-note"
                    className="text-sm font-medium text-white"
                  >
                    Optional note
                  </label>
                  <textarea
                    id="investor-note"
                    value={investorNote}
                    onChange={(event) =>
                      setInvestorNote(event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    className="mt-2 w-full resize-y border border-white/15 bg-black/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/40"
                    placeholder="Add information for the administrator reviewing this request."
                  />
                  <p className="mt-2 text-right text-xs text-white/30">
                    {investorNote.length}/1000
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.025] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/45">
                      Requested total
                    </span>
                    <span className="text-xl font-semibold text-white">
                      {currency(Math.max(calculatedTotal, 0))}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/35">
                    Submission creates a review request only. No wallet
                    transfer, private-key operation, or automatic payment
                    occurs from this page.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary min-h-12 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={16}
                        aria-hidden="true"
                        className="animate-spin"
                      />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} aria-hidden="true" />
                      Submit for review
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="mt-7 border border-dashed border-white/15 bg-black/25 px-6 py-14 text-center">
                <ShieldCheck
                  size={30}
                  aria-hidden="true"
                  className="mx-auto text-white/25"
                />
                <h3 className="mt-4 text-lg font-medium text-white">
                  No position is currently eligible
                </h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-white/40">
                  A position must be active, contain an available balance,
                  and have no open withdrawal request.
                </p>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  size={20}
                  aria-hidden="true"
                  className="text-emerald-100"
                />
                <h2 className="text-lg font-medium text-white">
                  Review controls
                </h2>
              </div>
              <div className="mt-5 space-y-4 text-sm leading-6 text-white/40">
                <p>
                  An administrator reviews and approves or rejects each
                  request.
                </p>
                <p>
                  A separate finance user processes an approved request;
                  the approving administrator cannot process the same
                  request.
                </p>
                <p>
                  Only a submitted request can be cancelled by the
                  investor.
                </p>
              </div>
            </section>

            <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                Position availability
              </p>
              <div className="mt-5 space-y-3">
                {positions.map((position) => (
                  <article
                    key={position.positionId}
                    className="border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {position.opportunityTitle}
                        </p>
                        <p className="mt-2 font-mono text-[11px] text-white/30">
                          {position.applicationReference}
                        </p>
                      </div>
                      <span
                        className={`border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                          position.hasOpenRequest
                            ? statusClasses(
                                position.openRequestStatus ?? 'submitted'
                              )
                            : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                        }`}
                      >
                        {position.hasOpenRequest
                          ? formatLabel(
                              position.openRequestStatus ?? 'submitted'
                            )
                          : 'Available'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-white/30">Capital</p>
                        <p className="mt-1 text-white/70">
                          {currency(position.remainingCapital)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/30">Profit</p>
                        <p className="mt-1 text-white/70">
                          {currency(position.availableProfit)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-6 border border-white/10 bg-white/[0.025] p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                Request history
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Withdrawal activity
              </h2>
            </div>
            <p className="text-sm text-white/35">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </p>
          </div>

          {requests.length ? (
            <div className="mt-7 space-y-4">
              {requests.map((request) => {
                const finalTotal =
                  request.approvedTotal > 0
                    ? request.approvedTotal
                    : request.requestedTotal

                return (
                  <article
                    key={request.requestId}
                    className="border border-white/10 bg-black/30 p-5 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-medium text-white">
                            {request.opportunityTitle}
                          </h3>
                          <span
                            className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClasses(
                              request.status
                            )}`}
                          >
                            {formatLabel(request.status)}
                          </span>
                        </div>
                        <p className="mt-3 font-mono text-xs text-white/30">
                          {request.requestReference}
                        </p>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                          {request.status === 'completed'
                            ? 'Completed total'
                            : 'Requested total'}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {currency(finalTotal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 border-y border-white/10 py-5 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                          Type
                        </p>
                        <p className="mt-2 text-sm text-white/75">
                          {formatLabel(request.requestType)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                          Asset
                        </p>
                        <p className="mt-2 text-sm text-white/75">
                          {request.payoutAsset} ·{' '}
                          {request.payoutNetwork === 'TRON_TESTNET_TRC20'
                            ? 'TRC20'
                            : 'Bitcoin'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                          Wallet
                        </p>
                        <p
                          className="mt-2 font-mono text-sm text-white/75"
                          title={request.walletAddress}
                        >
                          {maskWallet(request.walletAddress)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                          Submitted
                        </p>
                        <p className="mt-2 text-sm text-white/75">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>

                    {request.investorMessage ? (
                      <div className="mt-5 border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-white/55">
                        {request.investorMessage}
                      </div>
                    ) : null}

                    {request.transactionReference ? (
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                          Test transaction reference
                        </p>
                        <p className="mt-2 break-all font-mono text-xs text-white/60">
                          {request.transactionReference}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Clock3 size={14} aria-hidden="true" />
                        Updated {formatDate(request.updatedAt)}
                      </div>

                      {request.status === 'submitted' ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleCancel(request.requestId)
                          }
                          disabled={cancellingId === request.requestId}
                          className="btn btn-ghost min-h-10 gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingId === request.requestId ? (
                            <Loader2
                              size={15}
                              aria-hidden="true"
                              className="animate-spin"
                            />
                          ) : null}
                          Cancel request
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-7 border border-dashed border-white/15 bg-black/25 px-6 py-14 text-center">
              <WalletCards
                size={30}
                aria-hidden="true"
                className="mx-auto text-white/25"
              />
              <h3 className="mt-4 text-lg font-medium text-white">
                No withdrawal requests yet
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-white/40">
                Submitted requests and their review status will appear
                here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
