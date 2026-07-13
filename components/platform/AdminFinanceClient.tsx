'use client'

import React, { useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  WalletCards,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export type FinanceWallet = {
  id: string
  asset: 'BTC' | 'USDT'
  network: string
  address: string
  displayName: string
  instructions: string
  isActive: boolean
  environment: string
  createdAt: string
  updatedAt: string
}

export type FinanceDeposit = {
  depositId: string
  applicationId: string
  applicationReference: string

  investorUserId: string
  investorEmail: string
  investorDisplayName: string

  opportunityTitle: string
  approvedTarget: number
  minimumInvestment: number

  asset: string
  network: string
  walletAddressSnapshot: string
  assetAmount: number
  declaredUsdAmount: number | null
  transactionHash: string

  depositStatus: string
  creditedUsdAmount: number | null

  investorNote: string | null
  financeNote: string | null

  submittedAt: string
  reviewedAt: string | null
}

type AdminFinanceClientProps = {
  initialWallets: FinanceWallet[]
  initialDeposits: FinanceDeposit[]
}

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

type DepositFilter =
  | 'all'
  | 'pending_verification'
  | 'verified'
  | 'rejected'

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not reviewed'
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

function normalizeWallets(
  rows: RawWallet[]
): FinanceWallet[] {
  return rows.map((wallet) => ({
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
}

function normalizeDeposits(
  rows: RawFinanceDeposit[]
): FinanceDeposit[] {
  return rows.map((deposit) => ({
    depositId: deposit.deposit_id,
    applicationId: deposit.application_id,
    applicationReference:
      deposit.application_reference,

    investorUserId: deposit.investor_user_id,
    investorEmail: deposit.investor_email,
    investorDisplayName:
      deposit.investor_display_name,

    opportunityTitle: deposit.opportunity_title,
    approvedTarget: Number(deposit.approved_target),
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
}

export default function AdminFinanceClient({
  initialWallets,
  initialDeposits
}: AdminFinanceClientProps) {
  const supabase = useMemo(() => createClient(), [])

  const [wallets, setWallets] =
    useState(initialWallets)

  const [deposits, setDeposits] =
    useState(initialDeposits)

  const [filter, setFilter] =
    useState<DepositFilter>('all')

  const [asset, setAsset] =
    useState<'BTC' | 'USDT'>('USDT')

  const [network, setNetwork] = useState(
    'USDT DEMO SANDBOX'
  )

  const [address, setAddress] = useState('')
  const [displayName, setDisplayName] =
    useState('Internal Pilot Wallet')

  const [instructions, setInstructions] =
    useState(
      'Confirm that the selected network matches exactly. Save the transaction reference and submit it for finance review.'
    )

  const [reviewAmounts, setReviewAmounts] =
    useState<Record<string, string>>({})

  const [reviewNotes, setReviewNotes] =
    useState<Record<string, string>>({})

  const [savingWallet, setSavingWallet] =
    useState(false)

  const [refreshing, setRefreshing] =
    useState(false)

  const [reviewingId, setReviewingId] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const activeWallets = wallets.filter(
    (wallet) => wallet.isActive
  )

  const pendingCount = deposits.filter(
    (deposit) =>
      deposit.depositStatus ===
      'pending_verification'
  ).length

  const verifiedCapital = deposits
    .filter(
      (deposit) =>
        deposit.depositStatus === 'verified'
    )
    .reduce(
      (total, deposit) =>
        total + (deposit.creditedUsdAmount ?? 0),
      0
    )

  const filteredDeposits =
    filter === 'all'
      ? deposits
      : deposits.filter(
          (deposit) =>
            deposit.depositStatus === filter
        )

  const applicationCapital = useMemo(() => {
    const totals = new Map<string, number>()

    deposits
      .filter(
        (deposit) =>
          deposit.depositStatus === 'verified'
      )
      .forEach((deposit) => {
        totals.set(
          deposit.applicationId,
          (totals.get(deposit.applicationId) ?? 0) +
            (deposit.creditedUsdAmount ?? 0)
        )
      })

    return totals
  }, [deposits])

  async function reloadFinanceData() {
    setRefreshing(true)
    setError('')

    try {
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
        throw new Error(walletResult.error.message)
      }

      if (depositResult.error) {
        throw new Error(depositResult.error.message)
      }

      setWallets(
        normalizeWallets(
          (walletResult.data ?? []) as RawWallet[]
        )
      )

      setDeposits(
        normalizeDeposits(
          (depositResult.data ??
            []) as RawFinanceDeposit[]
        )
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Finance data could not be refreshed.'
      )
    } finally {
      setRefreshing(false)
    }
  }

  async function saveWallet(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const normalizedNetwork =
      network.trim().toUpperCase()

    const sandboxNetwork =
      normalizedNetwork.includes('TESTNET') ||
      normalizedNetwork.includes('SANDBOX') ||
      normalizedNetwork.includes('DEMO')

    if (!sandboxNetwork) {
      setError(
        'The network name must clearly include TESTNET, SANDBOX, or DEMO.'
      )
      return
    }

    if (address.trim().length < 12) {
      setError(
        'Enter a valid sandbox or testnet receiving address.'
      )
      return
    }

    if (displayName.trim().length < 2) {
      setError('Enter a wallet display name.')
      return
    }

    setSavingWallet(true)
    setError('')
    setMessage('')

    try {
      const { error: walletError } =
        await supabase.rpc(
          'save_funding_wallet',
          {
            p_asset: asset,
            p_network: normalizedNetwork,
            p_address: address.trim(),
            p_display_name: displayName.trim(),
            p_instructions: instructions.trim(),
            p_is_active: true
          }
        )

      if (walletError) {
        setError(walletError.message)
        return
      }

      await reloadFinanceData()

      setAddress('')
      setMessage(
        `${asset} sandbox wallet configuration saved successfully.`
      )
    } catch {
      setError(
        'The wallet configuration could not be saved.'
      )
    } finally {
      setSavingWallet(false)
    }
  }

  async function reviewDeposit(
    deposit: FinanceDeposit,
    decision: 'verified' | 'rejected'
  ) {
    const enteredAmount =
      reviewAmounts[deposit.depositId]?.trim() ?? ''

    const creditedAmount =
      decision === 'verified'
        ? Number(enteredAmount)
        : null

    if (
      decision === 'verified' &&
      (!Number.isFinite(creditedAmount) ||
        creditedAmount === null ||
        creditedAmount <= 0)
    ) {
      setError(
        'Enter the final credited USD amount before verifying this submission.'
      )
      return
    }

    const confirmed = window.confirm(
      decision === 'verified'
        ? `Verify this submission and credit ${currency(
            creditedAmount ?? 0
          )}?`
        : 'Reject this funding submission?'
    )

    if (!confirmed) {
      return
    }

    setReviewingId(deposit.depositId)
    setError('')
    setMessage('')

    try {
      const { data, error: reviewError } =
        await supabase.rpc(
          'review_investor_deposit',
          {
            p_deposit_id: deposit.depositId,
            p_decision: decision,
            p_credited_usd_amount:
              creditedAmount,
            p_finance_note:
              reviewNotes[
                deposit.depositId
              ]?.trim() || null
          }
        )

      const result = Array.isArray(data)
        ? data[0]
        : data

      if (reviewError || !result) {
        setError(
          reviewError?.message ??
            'The funding review could not be saved.'
        )
        return
      }

      setDeposits((current) =>
        current.map((item) =>
          item.depositId === deposit.depositId
            ? {
                ...item,
                depositStatus:
                  result.reviewed_status ??
                  decision,
                creditedUsdAmount:
                  result.credited_amount === null ||
                  result.credited_amount === undefined
                    ? null
                    : Number(result.credited_amount),
                financeNote:
                  reviewNotes[
                    deposit.depositId
                  ]?.trim() || null,
                reviewedAt: new Date().toISOString()
              }
            : item
        )
      )

      setReviewAmounts((current) => ({
        ...current,
        [deposit.depositId]: ''
      }))

      setReviewNotes((current) => ({
        ...current,
        [deposit.depositId]: ''
      }))

      setMessage(
        decision === 'verified'
          ? 'The funding submission was verified and capital was credited.'
          : 'The funding submission was rejected.'
      )
    } catch {
      setError(
        'Something went wrong while reviewing the submission.'
      )
    } finally {
      setReviewingId(null)
    }
  }

  const summaryCards = [
    {
      label: 'Active Wallets',
      value: String(activeWallets.length),
      icon: WalletCards
    },
    {
      label: 'Pending Reviews',
      value: String(pendingCount),
      icon: Clock3
    },
    {
      label: 'Verified Capital',
      value: currency(verifiedCapital),
      icon: CircleDollarSign
    },
    {
      label: 'Funding Records',
      value: String(deposits.length),
      icon: ShieldCheck
    }
  ]

  return (
    <div className="relative overflow-hidden bg-[#030303] pb-20">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
            <span className="flex h-9 w-9 items-center justify-center border border-white/15 bg-white/[0.03]">
              <ShieldCheck
                size={16}
                aria-hidden="true"
              />
            </span>

            MFA-Protected Finance Workspace
          </div>

          <div className="mt-6 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                Finance
                <span className="block text-white/40">
                  Operations
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
                Configure sandbox receiving wallets, review
                partial funding submissions, and credit
                verified investor capital.
              </p>
            </div>

            <button
              type="button"
              disabled={refreshing}
              onClick={reloadFinanceData}
              className="btn btn-ghost min-h-12 gap-2 disabled:opacity-40"
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={
                  refreshing ? 'animate-spin' : ''
                }
              />

              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="grid border border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, index) => {
            const Icon = card.icon

            return (
              <article
                key={card.label}
                className={[
                  'min-h-40 border-b border-white/10 bg-white/[0.025] p-6',
                  index % 2 === 0
                    ? 'sm:border-r'
                    : '',
                  index < 3 ? 'xl:border-r' : '',
                  index >= 2
                    ? 'sm:border-b-0'
                    : 'xl:border-b-0'
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    {card.label}
                  </p>

                  <Icon
                    size={18}
                    aria-hidden="true"
                    className="text-white/35"
                  />
                </div>

                <p className="mt-7 text-2xl font-semibold text-white">
                  {card.value}
                </p>
              </article>
            )
          })}
        </section>

        {error ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 border border-red-300/15 bg-red-300/[0.06] p-4 text-sm leading-6 text-red-100/75"
          >
            <XCircle
              size={16}
              aria-hidden="true"
              className="mt-1 shrink-0"
            />

            {error}
          </div>
        ) : null}

        {message ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-100/75"
          >
            <CheckCircle2
              size={16}
              aria-hidden="true"
              className="mt-1 shrink-0"
            />

            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="h-fit border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
              Sandbox Configuration
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Add Receiving Wallet
            </h2>

            <form
              onSubmit={saveWallet}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="finance-wallet-asset"
                  className="text-xs uppercase tracking-[0.14em] text-white/40"
                >
                  Asset
                </label>

                <select
                  id="finance-wallet-asset"
                  value={asset}
                  disabled={savingWallet}
                  onChange={(event) =>
                    setAsset(
                      event.target.value as
                        | 'BTC'
                        | 'USDT'
                    )
                  }
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
                >
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="finance-wallet-network"
                  className="text-xs uppercase tracking-[0.14em] text-white/40"
                >
                  Sandbox or testnet network
                </label>

                <input
                  id="finance-wallet-network"
                  type="text"
                  value={network}
                  disabled={savingWallet}
                  onChange={(event) =>
                    setNetwork(event.target.value)
                  }
                  placeholder="BITCOIN TESTNET"
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
                />
              </div>

              <div>
                <label
                  htmlFor="finance-wallet-address"
                  className="text-xs uppercase tracking-[0.14em] text-white/40"
                >
                  Public receiving address
                </label>

                <input
                  id="finance-wallet-address"
                  type="text"
                  value={address}
                  disabled={savingWallet}
                  onChange={(event) =>
                    setAddress(event.target.value)
                  }
                  placeholder="Testnet or sandbox address"
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 font-mono text-sm text-white outline-none focus:border-white/35"
                />
              </div>

              <div>
                <label
                  htmlFor="finance-wallet-name"
                  className="text-xs uppercase tracking-[0.14em] text-white/40"
                >
                  Display name
                </label>

                <input
                  id="finance-wallet-name"
                  type="text"
                  value={displayName}
                  disabled={savingWallet}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
                />
              </div>

              <div>
                <label
                  htmlFor="finance-wallet-instructions"
                  className="text-xs uppercase tracking-[0.14em] text-white/40"
                >
                  Investor instructions
                </label>

                <textarea
                  id="finance-wallet-instructions"
                  rows={5}
                  maxLength={4000}
                  value={instructions}
                  disabled={savingWallet}
                  onChange={(event) =>
                    setInstructions(event.target.value)
                  }
                  className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 text-sm leading-7 text-white outline-none focus:border-white/35"
                />
              </div>

              <div className="border border-amber-300/15 bg-amber-300/[0.05] p-4 text-xs leading-6 text-amber-100/65">
                Store only a public sandbox or testnet receiving
                address. Never enter a private key, seed phrase,
                recovery code, or exchange password.
              </div>

              <button
                type="submit"
                disabled={savingWallet}
                className="btn btn-primary min-h-12 w-full gap-2 disabled:opacity-40"
              >
                {savingWallet ? (
                  <>
                    <Loader2
                      size={16}
                      aria-hidden="true"
                      className="animate-spin"
                    />
                    Saving Wallet
                  </>
                ) : (
                  <>
                    <Save
                      size={16}
                      aria-hidden="true"
                    />
                    Save Wallet
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
              Receiving Instructions
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Configured Wallets
            </h2>

            {wallets.length ? (
              <div className="mt-7 space-y-4">
                {wallets.map((wallet) => (
                  <article
                    key={wallet.id}
                    className="border border-white/10 bg-black/30 p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-medium text-white">
                            {wallet.displayName}
                          </h3>

                          <span
                            className={
                              wallet.isActive
                                ? 'border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100'
                                : 'border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/40'
                            }
                          >
                            {wallet.isActive
                              ? 'Active'
                              : 'Retired'}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/45">
                          {wallet.asset} · {wallet.network}
                        </p>
                      </div>

                      <span className="text-xs uppercase tracking-[0.12em] text-white/25">
                        {wallet.environment}
                      </span>
                    </div>

                    <code className="mt-5 block break-all border-t border-white/10 pt-4 text-xs leading-6 text-white/55">
                      {wallet.address}
                    </code>

                    {wallet.instructions ? (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/35">
                        {wallet.instructions}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-7 border border-dashed border-white/15 px-6 py-14 text-center">
                <WalletCards
                  size={28}
                  aria-hidden="true"
                  className="mx-auto text-white/25"
                />

                <p className="mt-4 text-sm text-white/40">
                  No sandbox receiving wallets have been
                  configured.
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                Manual Finance Verification
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                Funding Submission Queue
              </h2>
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as DepositFilter
                )
              }
              className="min-h-11 border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
            >
              <option value="all">All submissions</option>
              <option value="pending_verification">
                Pending verification
              </option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {filteredDeposits.length ? (
            <div className="mt-7 space-y-5">
              {filteredDeposits.map((deposit) => {
                const fundedCapital =
                  applicationCapital.get(
                    deposit.applicationId
                  ) ?? 0

                const minimumProgress =
                  deposit.minimumInvestment > 0
                    ? Math.min(
                        100,
                        (fundedCapital /
                          deposit.minimumInvestment) *
                          100
                      )
                    : 0

                const targetProgress =
                  deposit.approvedTarget > 0
                    ? Math.min(
                        100,
                        (fundedCapital /
                          deposit.approvedTarget) *
                          100
                      )
                    : 0

                const isPending =
                  deposit.depositStatus ===
                  'pending_verification'

                const isReviewing =
                  reviewingId === deposit.depositId

                return (
                  <article
                    key={deposit.depositId}
                    className="border border-white/10 bg-black/30 p-5 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-medium text-white">
                            {deposit.investorDisplayName}
                          </h3>

                          <span
                            className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClasses(
                              deposit.depositStatus
                            )}`}
                          >
                            {formatStatus(
                              deposit.depositStatus
                            )}
                          </span>
                        </div>

                        <p className="mt-2 break-all text-sm text-white/40">
                          {deposit.investorEmail}
                        </p>

                        <p className="mt-4 text-sm text-white/65">
                          {deposit.opportunityTitle}
                        </p>

                        <p className="mt-1 font-mono text-xs text-white/30">
                          {deposit.applicationReference}
                        </p>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-xl font-semibold text-white">
                          {deposit.assetAmount}{' '}
                          {deposit.asset}
                        </p>

                        <p className="mt-2 text-sm text-white/45">
                          Declared value:{' '}
                          {deposit.declaredUsdAmount
                            ? currency(
                                deposit.declaredUsdAmount
                              )
                            : 'Not supplied'}
                        </p>

                        <time className="mt-2 block text-xs text-white/30">
                          {formatDate(deposit.submittedAt)}
                        </time>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 border-y border-white/10 py-5 lg:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                          Network
                        </p>

                        <p className="mt-2 text-sm text-white/65">
                          {deposit.network}
                        </p>

                        <p className="mt-5 text-xs uppercase tracking-[0.13em] text-white/30">
                          Transaction reference
                        </p>

                        <code className="mt-2 block break-all text-xs leading-6 text-white/55">
                          {deposit.transactionHash}
                        </code>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                          Wallet snapshot
                        </p>

                        <code className="mt-2 block break-all text-xs leading-6 text-white/55">
                          {deposit.walletAddressSnapshot}
                        </code>

                        {deposit.investorNote ? (
                          <>
                            <p className="mt-5 text-xs uppercase tracking-[0.13em] text-white/30">
                              Investor note
                            </p>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/45">
                              {deposit.investorNote}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 lg:grid-cols-2">
                      <div>
                        <div className="flex justify-between text-xs text-white/40">
                          <span>Minimum progress</span>
                          <span>
                            {minimumProgress.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden bg-white/10">
                          <div
                            className="h-full bg-white"
                            style={{
                              width: `${minimumProgress}%`
                            }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-white/25">
                          {currency(fundedCapital)} of{' '}
                          {currency(
                            deposit.minimumInvestment
                          )}
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-white/40">
                          <span>Approved target</span>
                          <span>
                            {targetProgress.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden bg-white/10">
                          <div
                            className="h-full bg-white"
                            style={{
                              width: `${targetProgress}%`
                            }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-white/25">
                          {currency(fundedCapital)} of{' '}
                          {currency(
                            deposit.approvedTarget
                          )}
                        </p>
                      </div>
                    </div>

                    {isPending ? (
                      <div className="mt-6 grid gap-5 border-t border-white/10 pt-6 lg:grid-cols-[0.45fr_0.55fr]">
                        <div>
                          <label
                            htmlFor={`credited-${deposit.depositId}`}
                            className="text-xs uppercase tracking-[0.13em] text-white/35"
                          >
                            Final credited USD amount
                          </label>

                          <input
                            id={`credited-${deposit.depositId}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              reviewAmounts[
                                deposit.depositId
                              ] ?? ''
                            }
                            disabled={isReviewing}
                            onChange={(event) => {
                              setReviewAmounts(
                                (current) => ({
                                  ...current,
                                  [deposit.depositId]:
                                    event.target.value
                                })
                              )
                              setError('')
                              setMessage('')
                            }}
                            placeholder={
                              deposit.declaredUsdAmount
                                ? String(
                                    deposit.declaredUsdAmount
                                  )
                                : '0.00'
                            }
                            className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`finance-note-${deposit.depositId}`}
                            className="text-xs uppercase tracking-[0.13em] text-white/35"
                          >
                            Internal finance note
                          </label>

                          <textarea
                            id={`finance-note-${deposit.depositId}`}
                            rows={3}
                            maxLength={2000}
                            value={
                              reviewNotes[
                                deposit.depositId
                              ] ?? ''
                            }
                            disabled={isReviewing}
                            onChange={(event) =>
                              setReviewNotes(
                                (current) => ({
                                  ...current,
                                  [deposit.depositId]:
                                    event.target.value
                                })
                              )
                            }
                            placeholder="Optional verification or rejection note"
                            className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-white/35"
                          />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
                          <button
                            type="button"
                            disabled={isReviewing}
                            onClick={() =>
                              reviewDeposit(
                                deposit,
                                'verified'
                              )
                            }
                            className="btn btn-primary min-h-12 flex-1 gap-2 disabled:opacity-40"
                          >
                            {isReviewing ? (
                              <Loader2
                                size={16}
                                aria-hidden="true"
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle2
                                size={16}
                                aria-hidden="true"
                              />
                            )}

                            Verify and Credit
                          </button>

                          <button
                            type="button"
                            disabled={isReviewing}
                            onClick={() =>
                              reviewDeposit(
                                deposit,
                                'rejected'
                              )
                            }
                            className="btn btn-ghost min-h-12 flex-1 gap-2 border-red-300/15 text-red-100/70 disabled:opacity-40"
                          >
                            <XCircle
                              size={16}
                              aria-hidden="true"
                            />
                            Reject Submission
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 border-t border-white/10 pt-5">
                        <p className="text-sm text-white/55">
                          Credited capital:{' '}
                          <span className="font-medium text-white">
                            {deposit.creditedUsdAmount
                              ? currency(
                                  deposit.creditedUsdAmount
                                )
                              : 'None'}
                          </span>
                        </p>

                        {deposit.financeNote ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/40">
                            {deposit.financeNote}
                          </p>
                        ) : null}

                        <p className="mt-3 text-xs text-white/25">
                          Reviewed{' '}
                          {formatDate(
                            deposit.reviewedAt
                          )}
                        </p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-7 border border-dashed border-white/15 px-6 py-16 text-center">
              <Clock3
                size={29}
                aria-hidden="true"
                className="mx-auto text-white/25"
              />

              <p className="mt-4 text-sm text-white/40">
                No funding submissions match this filter.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
