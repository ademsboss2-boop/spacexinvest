'use client'

import React, { useMemo, useState } from 'react'
import {
  Check,
  Clock3,
  Copy,
  Loader2,
  Send,
  ShieldCheck,
  WalletCards,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export type FundingWallet = {
  id: string
  asset: 'BTC' | 'USDT'
  network: string
  address: string
  displayName: string
  instructions: string
}

export type InvestorDeposit = {
  id: string
  asset: string
  network: string
  assetAmount: number
  declaredUsdAmount: number | null
  transactionHash: string
  status: string
  creditedUsdAmount: number | null
  submittedAt: string
}

type InvestorFundingClientProps = {
  applicationId: string
  referenceCode: string
  opportunityTitle: string
  approvedTarget: number
  minimumInvestment: number
  wallets: FundingWallet[]
  initialDeposits: InvestorDeposit[]
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

function statusClasses(status: string) {
  switch (status) {
    case 'verified':
      return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'

    case 'rejected':
      return 'border-red-300/20 bg-red-300/10 text-red-200'

    default:
      return 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  }
}

export default function InvestorFundingClient({
  applicationId,
  referenceCode,
  opportunityTitle,
  approvedTarget,
  minimumInvestment,
  wallets,
  initialDeposits
}: InvestorFundingClientProps) {
  const supabase = useMemo(() => createClient(), [])

  const [deposits, setDeposits] =
    useState(initialDeposits)

  const [walletId, setWalletId] = useState(
    wallets[0]?.id ?? ''
  )

  const [assetAmount, setAssetAmount] = useState('')
  const [declaredUsdAmount, setDeclaredUsdAmount] =
    useState('')
  const [transactionHash, setTransactionHash] =
    useState('')
  const [investorNote, setInvestorNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedWallet =
    wallets.find((wallet) => wallet.id === walletId) ??
    wallets[0] ??
    null

  const verifiedCapital = deposits
    .filter((deposit) => deposit.status === 'verified')
    .reduce(
      (total, deposit) =>
        total + (deposit.creditedUsdAmount ?? 0),
      0
    )

  const pendingDeclaredCapital = deposits
    .filter(
      (deposit) =>
        deposit.status === 'pending_verification'
    )
    .reduce(
      (total, deposit) =>
        total + (deposit.declaredUsdAmount ?? 0),
      0
    )

  const minimumProgress =
    minimumInvestment > 0
      ? Math.min(
          100,
          (verifiedCapital / minimumInvestment) * 100
        )
      : 0

  const targetProgress =
    approvedTarget > 0
      ? Math.min(
          100,
          (verifiedCapital / approvedTarget) * 100
        )
      : 0

  const remainingToMinimum = Math.max(
    minimumInvestment - verifiedCapital,
    0
  )

  const remainingToTarget = Math.max(
    approvedTarget - verifiedCapital,
    0
  )

  async function copyAddress() {
    if (!selectedWallet) return

    try {
      await navigator.clipboard.writeText(
        selectedWallet.address
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1800)
    } catch {
      setError(
        'The wallet address could not be copied automatically.'
      )
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const numericAssetAmount = Number(assetAmount)
    const numericDeclaredUsd =
      declaredUsdAmount.trim() === ''
        ? null
        : Number(declaredUsdAmount)

    if (!selectedWallet) {
      setError('Select an available funding wallet.')
      return
    }

    if (
      !Number.isFinite(numericAssetAmount) ||
      numericAssetAmount <= 0
    ) {
      setError('Enter a valid asset amount.')
      return
    }

    if (
      numericDeclaredUsd !== null &&
      (!Number.isFinite(numericDeclaredUsd) ||
        numericDeclaredUsd <= 0)
    ) {
      setError('Enter a valid declared USD amount.')
      return
    }

    if (transactionHash.trim().length < 12) {
      setError('Enter a valid transaction reference.')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const { data, error: submissionError } =
        await supabase.rpc(
          'submit_investor_deposit',
          {
            p_application_id: applicationId,
            p_wallet_id: selectedWallet.id,
            p_asset_amount: numericAssetAmount,
            p_declared_usd_amount:
              numericDeclaredUsd,
            p_transaction_hash:
              transactionHash.trim(),
            p_investor_note:
              investorNote.trim() || null
          }
        )

      const result = Array.isArray(data)
        ? data[0]
        : data

      if (submissionError || !result) {
        setError(
          submissionError?.message ??
            'The funding submission could not be recorded.'
        )
        return
      }

      setDeposits((current) => [
        {
          id: result.deposit_id,
          asset: selectedWallet.asset,
          network: selectedWallet.network,
          assetAmount: numericAssetAmount,
          declaredUsdAmount: numericDeclaredUsd,
          transactionHash:
            transactionHash.trim(),
          status:
            result.deposit_status ??
            'pending_verification',
          creditedUsdAmount: null,
          submittedAt:
            result.submitted_at ??
            new Date().toISOString()
        },
        ...current
      ])

      setAssetAmount('')
      setDeclaredUsdAmount('')
      setTransactionHash('')
      setInvestorNote('')

      setMessage(
        'Funding reference submitted for finance verification.'
      )
    } catch {
      setError(
        'Something went wrong while recording the funding submission.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-white/35">
          Approved Funding Allocation
        </p>

        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-white sm:text-5xl">
          {opportunityTitle}
        </h1>

        <p className="mt-3 font-mono text-sm text-white/35">
          {referenceCode}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">
              Verified capital
            </p>

            <p className="mt-3 text-2xl font-semibold text-white">
              {currency(verifiedCapital)}
            </p>
          </div>

          <div className="border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">
              Pending verification
            </p>

            <p className="mt-3 text-2xl font-semibold text-white">
              {currency(pendingDeclaredCapital)}
            </p>
          </div>

          <div className="border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">
              Minimum remaining
            </p>

            <p className="mt-3 text-2xl font-semibold text-white">
              {currency(remainingToMinimum)}
            </p>
          </div>

          <div className="border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">
              Target remaining
            </p>

            <p className="mt-3 text-2xl font-semibold text-white">
              {currency(remainingToTarget)}
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex justify-between gap-4 text-xs text-white/45">
              <span>Minimum investment progress</span>
              <span>{minimumProgress.toFixed(1)}%</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden bg-white/10">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width: `${minimumProgress}%`
                }}
              />
            </div>

            <p className="mt-3 text-xs text-white/30">
              Minimum milestone: {currency(minimumInvestment)}
            </p>
          </div>

          <div>
            <div className="flex justify-between gap-4 text-xs text-white/45">
              <span>Approved allocation progress</span>
              <span>{targetProgress.toFixed(1)}%</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden bg-white/10">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width: `${targetProgress}%`
                }}
              />
            </div>

            <p className="mt-3 text-xs text-white/30">
              Approved target: {currency(approvedTarget)}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
              <WalletCards
                size={19}
                aria-hidden="true"
                className="text-white/55"
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                Sandbox Funding Instructions
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/40">
                Select an approved sandbox or testnet wallet.
                Do not send production funds to this environment.
              </p>
            </div>
          </div>

          {wallets.length === 0 ? (
            <div className="mt-7 border border-dashed border-white/15 px-5 py-12 text-center">
              <p className="text-sm text-white/40">
                Finance has not configured a sandbox wallet yet.
              </p>
            </div>
          ) : (
            <>
              <label
                htmlFor="funding-wallet"
                className="mt-7 block text-xs uppercase tracking-[0.14em] text-white/40"
              >
                Funding method
              </label>

              <select
                id="funding-wallet"
                value={walletId}
                onChange={(event) => {
                  setWalletId(event.target.value)
                  setError('')
                  setMessage('')
                }}
                className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
              >
                {wallets.map((wallet) => (
                  <option
                    key={wallet.id}
                    value={wallet.id}
                  >
                    {wallet.asset} — {wallet.network}
                  </option>
                ))}
              </select>

              {selectedWallet ? (
                <div className="mt-6 border border-white/10 bg-black/35 p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                    {selectedWallet.displayName}
                  </p>

                  <p className="mt-2 text-sm text-white/50">
                    {selectedWallet.asset} ·{' '}
                    {selectedWallet.network}
                  </p>

                  <div className="mt-5 flex items-start gap-3">
                    <code className="min-w-0 flex-1 break-all text-sm leading-7 text-white/75">
                      {selectedWallet.address}
                    </code>

                    <button
                      type="button"
                      onClick={copyAddress}
                      aria-label="Copy wallet address"
                      className="flex min-h-10 min-w-10 shrink-0 items-center justify-center border border-white/10 text-white/55 hover:text-white"
                    >
                      {copied ? (
                        <Check size={15} aria-hidden="true" />
                      ) : (
                        <Copy size={15} aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {selectedWallet.instructions ? (
                    <p className="mt-5 whitespace-pre-wrap border-t border-white/10 pt-4 text-sm leading-7 text-white/40">
                      {selectedWallet.instructions}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
              <Send
                size={18}
                aria-hidden="true"
                className="text-white/55"
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                Submit Funding Reference
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/40">
                Partial submissions are supported. Finance will
                confirm the final credited USD value.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="asset-amount"
                className="text-xs uppercase tracking-[0.14em] text-white/40"
              >
                Asset amount sent
              </label>

              <input
                id="asset-amount"
                type="number"
                min="0"
                step="any"
                value={assetAmount}
                disabled={submitting || !selectedWallet}
                onChange={(event) => {
                  setAssetAmount(event.target.value)
                  setError('')
                }}
                placeholder="0.00"
                className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35 disabled:opacity-40"
              />
            </div>

            <div>
              <label
                htmlFor="declared-usd"
                className="text-xs uppercase tracking-[0.14em] text-white/40"
              >
                Estimated USD value
              </label>

              <input
                id="declared-usd"
                type="number"
                min="0"
                step="0.01"
                value={declaredUsdAmount}
                disabled={submitting || !selectedWallet}
                onChange={(event) => {
                  setDeclaredUsdAmount(event.target.value)
                  setError('')
                }}
                placeholder="Optional estimate"
                className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35 disabled:opacity-40"
              />
            </div>

            <div>
              <label
                htmlFor="transaction-hash"
                className="text-xs uppercase tracking-[0.14em] text-white/40"
              >
                Transaction reference
              </label>

              <input
                id="transaction-hash"
                type="text"
                value={transactionHash}
                disabled={submitting || !selectedWallet}
                onChange={(event) => {
                  setTransactionHash(event.target.value)
                  setError('')
                }}
                placeholder="Enter the sandbox transaction hash"
                className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35 disabled:opacity-40"
              />
            </div>

            <div>
              <label
                htmlFor="investor-note"
                className="text-xs uppercase tracking-[0.14em] text-white/40"
              >
                Note
              </label>

              <textarea
                id="investor-note"
                rows={3}
                maxLength={1000}
                value={investorNote}
                disabled={submitting || !selectedWallet}
                onChange={(event) =>
                  setInvestorNote(event.target.value)
                }
                placeholder="Optional information for finance"
                className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 text-sm leading-6 text-white outline-none focus:border-white/35 disabled:opacity-40"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 text-sm leading-6 text-red-200"
              >
                <XCircle
                  size={15}
                  aria-hidden="true"
                  className="mt-1 shrink-0"
                />
                {error}
              </div>
            ) : null}

            {message ? (
              <div
                role="status"
                className="flex items-start gap-2 text-sm leading-6 text-emerald-100"
              >
                <ShieldCheck
                  size={15}
                  aria-hidden="true"
                  className="mt-1 shrink-0"
                />
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !selectedWallet}
              className="btn btn-primary min-h-12 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={16}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                  Submitting
                </>
              ) : (
                <>
                  <Send size={16} aria-hidden="true" />
                  Submit for Verification
                </>
              )}
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Clock3
            size={19}
            aria-hidden="true"
            className="text-white/45"
          />

          <h2 className="text-xl font-semibold text-white">
            Funding History
          </h2>
        </div>

        {deposits.length ? (
          <div className="mt-6 space-y-4">
            {deposits.map((deposit) => (
              <article
                key={deposit.id}
                className="border border-white/10 bg-black/30 p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-medium text-white">
                        {deposit.asset} · {deposit.network}
                      </h3>

                      <span
                        className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClasses(
                          deposit.status
                        )}`}
                      >
                        {formatStatus(deposit.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-white/45">
                      Asset amount: {deposit.assetAmount}
                    </p>

                    <p className="mt-2 break-all font-mono text-xs text-white/30">
                      {deposit.transactionHash}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm text-white/70">
                      {deposit.creditedUsdAmount
                        ? currency(deposit.creditedUsdAmount)
                        : deposit.declaredUsdAmount
                          ? currency(deposit.declaredUsdAmount)
                          : 'Awaiting valuation'}
                    </p>

                    <time className="mt-2 block text-xs text-white/30">
                      {formatDate(deposit.submittedAt)}
                    </time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-white/15 px-5 py-12 text-center">
            <p className="text-sm text-white/40">
              No funding submissions have been recorded.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
