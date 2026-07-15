'use client'

import React, {
  useEffect,
  useMemo,
  useState
} from 'react'
import {
  Activity,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import {
  requestInvestorNotification
} from '../../lib/email/request-investor-notification'

export type FinancePortfolio = {
  positionId: string
  applicationId: string
  applicationReference: string

  investorUserId: string
  investorEmail: string
  investorDisplayName: string

  opportunityTitle: string
  portfolioStatus: string

  fundedCapital: number
  currentValue: number
  totalDistributions: number
  totalPnl: number
  roiPercentage: number

  lastValuedAt: string | null
}

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

type Props = {
  initialPortfolios: FinancePortfolio[]
}

function normalize(
  rows: RawFinancePortfolio[]
): FinancePortfolio[] {
  return rows.map((portfolio) => ({
    positionId: portfolio.position_id,
    applicationId: portfolio.application_id,
    applicationReference:
      portfolio.application_reference,

    investorUserId: portfolio.investor_user_id,
    investorEmail: portfolio.investor_email,
    investorDisplayName:
      portfolio.investor_display_name,

    opportunityTitle: portfolio.opportunity_title,
    portfolioStatus: portfolio.portfolio_status,

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
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function percentage(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

type RpcError = {
  message?: string
  details?: string | null
  hint?: string | null
  code?: string
}

function rpcErrorMessage(
  error: RpcError,
  fallback: string
) {
  const parts = [
    error.message,
    error.details,
    error.hint
  ]
    .filter(
      (value): value is string =>
        Boolean(value?.trim())
    )
    .map((value) => value.trim())

  const message = [...new Set(parts)].join(' ')

  return error.code
    ? `${message || fallback} (${error.code})`
    : message || fallback
}

function today() {
  const now = new Date()

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000
  )

  return localDate.toISOString().slice(0, 10)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No valuation recorded'
  }

  const date = new Date(value)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

export default function AdminPortfolioClient({
  initialPortfolios
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [portfolios, setPortfolios] =
    useState(initialPortfolios)

  const [selectedApplicationId, setSelectedApplicationId] =
    useState(initialPortfolios[0]?.applicationId ?? '')

  const [valuationValue, setValuationValue] =
    useState('')

  const [valuationDate, setValuationDate] =
    useState(today())

  const [valuationNote, setValuationNote] =
    useState('')

  const [distributionType, setDistributionType] =
    useState<
      'income' | 'realized_profit' | 'return_of_capital'
    >('income')

  const [distributionAmount, setDistributionAmount] =
    useState('')

  const [distributionDate, setDistributionDate] =
    useState(today())

  const [distributionNote, setDistributionNote] =
    useState('')

  const [profitCreditAmount, setProfitCreditAmount] =
    useState('')

  const [profitCreditDate, setProfitCreditDate] =
    useState(today())

  const [profitCreditNote, setProfitCreditNote] =
    useState('')

  const [portfolioStatus, setPortfolioStatus] =
    useState<'funding' | 'active' | 'closed'>(
      'funding'
    )

  const [workingAction, setWorkingAction] =
    useState<string | null>(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedPortfolio = portfolios.find(
    (portfolio) =>
      portfolio.applicationId === selectedApplicationId
  )

  useEffect(() => {
    if (!selectedPortfolio) {
      return
    }

    setValuationValue(
      String(selectedPortfolio.currentValue)
    )

    setPortfolioStatus(
      selectedPortfolio.portfolioStatus as
        | 'funding'
        | 'active'
        | 'closed'
    )
  }, [selectedPortfolio])

  const totals = useMemo(
    () =>
      portfolios.reduce(
        (summary, portfolio) => ({
          funded:
            summary.funded +
            portfolio.fundedCapital,

          value:
            summary.value +
            portfolio.currentValue,

          distributions:
            summary.distributions +
            portfolio.totalDistributions,

          pnl:
            summary.pnl +
            portfolio.totalPnl
        }),
        {
          funded: 0,
          value: 0,
          distributions: 0,
          pnl: 0
        }
      ),
    [portfolios]
  )

  async function reloadPortfolios() {
    const { data, error: reloadError } =
      await supabase.rpc(
        'list_finance_portfolios',
        {
          p_limit: 200
        }
      )

    if (reloadError) {
      throw new Error(reloadError.message)
    }

    setPortfolios(
      normalize(
        (data ?? []) as RawFinancePortfolio[]
      )
    )
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
      await reloadPortfolios()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The portfolio action could not be completed.'
      )
    } finally {
      setWorkingAction(null)
    }
  }

  async function recordValuation(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!selectedPortfolio) {
      setError('Select a portfolio position.')
      return
    }

    const amount = Number(valuationValue)

    if (!Number.isFinite(amount) || amount < 0) {
      setError(
        'Enter a valid current portfolio value.'
      )
      return
    }

    await runAction('valuation', async () => {
      const { error: valuationError } =
        await supabase.rpc(
          'record_portfolio_valuation',
          {
            p_application_id:
              selectedPortfolio.applicationId,
            p_current_value: amount,
            p_as_of_date: valuationDate,
            p_finance_note:
              valuationNote.trim() || null
          }
        )

      if (valuationError) {
        throw new Error(
          rpcErrorMessage(
            valuationError,
            'The valuation could not be recorded.'
          )
        )
      }

      setValuationNote('')
      setMessage(
        'The portfolio valuation was recorded successfully.'
      )
    })
  }

  async function recordDistribution(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!selectedPortfolio) {
      setError('Select a portfolio position.')
      return
    }

    const amount = Number(distributionAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        'Enter a distribution amount greater than zero.'
      )
      return
    }

    await runAction('distribution', async () => {
      const {
        data: distributionId,
        error: distributionError
      } = await supabase.rpc(
        'record_portfolio_distribution',
        {
          p_application_id:
            selectedPortfolio.applicationId,
          p_distribution_type:
            distributionType,
          p_amount: amount,
          p_effective_date:
            distributionDate,
          p_finance_note:
            distributionNote.trim() || null
        }
      )

      if (distributionError) {
        throw new Error(
          rpcErrorMessage(
            distributionError,
            'The distribution could not be recorded.'
          )
        )
      }

      let notificationSent = false

      if (typeof distributionId === 'string') {
        try {
          notificationSent =
            await requestInvestorNotification(
              'distribution_recorded',
              distributionId
            )
        } catch (notificationError) {
          console.warn(
            'Distribution saved, but email notification failed.',
            notificationError
          )
        }
      }

      setDistributionAmount('')
      setDistributionNote('')

      setMessage(
        notificationSent
          ? 'The portfolio distribution was recorded and the notification email was sent.'
          : 'The portfolio distribution was recorded successfully. The notification email was not sent.'
      )
    })
  }

  async function recordProfitCredit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!selectedPortfolio) {
      setError('Select a portfolio position.')
      return
    }

    if (selectedPortfolio.portfolioStatus !== 'active') {
      setError(
        'Withdrawable profit can only be credited to an active portfolio.'
      )
      return
    }

    const amount = Number(profitCreditAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        'Enter a withdrawable-profit amount greater than zero.'
      )
      return
    }

    await runAction('profit-credit', async () => {
      const { error: profitCreditError } =
        await supabase.rpc(
          'record_portfolio_profit_credit',
          {
            p_position_id:
              selectedPortfolio.positionId,
            p_amount: amount,
            p_effective_date:
              profitCreditDate,
            p_finance_note:
              profitCreditNote.trim() || null
          }
        )

      if (profitCreditError) {
        throw new Error(
          rpcErrorMessage(
            profitCreditError,
            'Withdrawable profit could not be credited.'
          )
        )
      }

      setProfitCreditAmount('')
      setProfitCreditNote('')

      setMessage(
        'Withdrawable realized profit was credited successfully.'
      )
    })
  }

  async function updateStatus() {
    if (!selectedPortfolio) {
      setError('Select a portfolio position.')
      return
    }

    const confirmed = window.confirm(
      `Change this portfolio status to ${portfolioStatus}?`
    )

    if (!confirmed) {
      return
    }

    await runAction('status', async () => {
      const { error: statusError } =
        await supabase.rpc(
          'set_portfolio_status',
          {
            p_application_id:
              selectedPortfolio.applicationId,
            p_status: portfolioStatus
          }
        )

      if (statusError) {
        throw new Error(statusError.message)
      }

      setMessage(
        'The portfolio status was updated successfully.'
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
                Portfolio
                <span className="block text-white/40">
                  Administration
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/45">
                Record internal valuations, distributions,
                and lifecycle changes for funded portfolio
                positions.
              </p>
            </div>

            <button
              type="button"
              disabled={workingAction !== null}
              onClick={() =>
                runAction('refresh', reloadPortfolios)
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
        <section className="grid border border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Verified Capital', currency(totals.funded)],
            ['Current Value', currency(totals.value)],
            [
              'Distributions',
              currency(totals.distributions)
            ],
            ['Total P&L', currency(totals.pnl)]
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

        {portfolios.length ? (
          <>
            <section className="mt-6 border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <label className="text-xs uppercase tracking-[0.15em] text-white/35">
                Selected Portfolio
              </label>

              <select
                value={selectedApplicationId}
                onChange={(event) =>
                  setSelectedApplicationId(
                    event.target.value
                  )
                }
                className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
              >
                {portfolios.map((portfolio) => (
                  <option
                    key={portfolio.positionId}
                    value={portfolio.applicationId}
                  >
                    {portfolio.investorDisplayName} —{' '}
                    {portfolio.opportunityTitle}
                  </option>
                ))}
              </select>

              {selectedPortfolio ? (
                <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs text-white/30">
                      Investor
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {
                        selectedPortfolio.investorDisplayName
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/30">
                      Verified Capital
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {currency(
                        selectedPortfolio.fundedCapital
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/30">
                      Current Value
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {currency(
                        selectedPortfolio.currentValue
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/30">
                      P&amp;L / ROI
                    </p>
                    <p
                      className={
                        selectedPortfolio.totalPnl >= 0
                          ? 'mt-2 text-sm text-emerald-100'
                          : 'mt-2 text-sm text-red-200'
                      }
                    >
                      {currency(
                        selectedPortfolio.totalPnl
                      )}{' '}
                      ·{' '}
                      {percentage(
                        selectedPortfolio.roiPercentage
                      )}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-2 2xl:grid-cols-4">
              <form
                onSubmit={recordValuation}
                className="border border-white/10 bg-white/[0.025] p-6"
              >
                <Activity
                  size={18}
                  className="text-white/35"
                />

                <h2 className="mt-4 text-xl font-semibold text-white">
                  Record Valuation
                </h2>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valuationValue}
                  onChange={(event) =>
                    setValuationValue(
                      event.target.value
                    )
                  }
                  placeholder="Current value"
                  className="mt-6 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                />

                <input
                  type="date"
                  value={valuationDate}
                  onChange={(event) =>
                    setValuationDate(
                      event.target.value
                    )
                  }
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                />

                <textarea
                  rows={3}
                  value={valuationNote}
                  onChange={(event) =>
                    setValuationNote(
                      event.target.value
                    )
                  }
                  placeholder="Internal valuation note"
                  className="mt-3 w-full border border-white/10 bg-black p-4 text-sm text-white"
                />

                <button
                  type="submit"
                  disabled={workingAction !== null}
                  className="btn btn-primary mt-4 min-h-12 w-full gap-2"
                >
                  {workingAction === 'valuation' ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Valuation
                </button>
              </form>

              <form
                onSubmit={recordDistribution}
                className="border border-white/10 bg-white/[0.025] p-6"
              >
                <CircleDollarSign
                  size={18}
                  className="text-white/35"
                />

                <h2 className="mt-4 text-xl font-semibold text-white">
                  Record Distribution
                </h2>

                <select
                  value={distributionType}
                  onChange={(event) =>
                    setDistributionType(
                      event.target.value as
                        | 'income'
                        | 'realized_profit'
                        | 'return_of_capital'
                    )
                  }
                  className="mt-6 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                >
                  <option value="income">
                    Income
                  </option>
                  <option value="realized_profit">
                    Realized profit paid
                  </option>
                  <option value="return_of_capital">
                    Return of capital
                  </option>
                </select>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={distributionAmount}
                  onChange={(event) =>
                    setDistributionAmount(
                      event.target.value
                    )
                  }
                  placeholder="Distribution amount"
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                />

                <input
                  type="date"
                  value={distributionDate}
                  onChange={(event) =>
                    setDistributionDate(
                      event.target.value
                    )
                  }
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                />

                <textarea
                  rows={3}
                  value={distributionNote}
                  onChange={(event) =>
                    setDistributionNote(
                      event.target.value
                    )
                  }
                  placeholder="Internal distribution note"
                  className="mt-3 w-full border border-white/10 bg-black p-4 text-sm text-white"
                />

                <button
                  type="submit"
                  disabled={workingAction !== null}
                  className="btn btn-primary mt-4 min-h-12 w-full gap-2"
                >
                  {workingAction === 'distribution' ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <CircleDollarSign size={16} />
                  )}
                  Save Distribution
                </button>
              </form>

              <form
                onSubmit={recordProfitCredit}
                className="border border-white/10 bg-white/[0.025] p-6"
              >
                <TrendingUp
                  size={18}
                  className="text-emerald-100"
                />

                <h2 className="mt-4 text-xl font-semibold text-white">
                  Credit Withdrawable Profit
                </h2>

                <p className="mt-3 text-xs leading-6 text-white/35">
                  Makes realized profit available for an investor
                  withdrawal. This does not mark the profit as paid.
                </p>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={profitCreditAmount}
                  onChange={(event) =>
                    setProfitCreditAmount(
                      event.target.value
                    )
                  }
                  placeholder="Withdrawable profit amount"
                  className="mt-6 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                />

                <input
                  type="date"
                  value={profitCreditDate}
                  onChange={(event) =>
                    setProfitCreditDate(
                      event.target.value
                    )
                  }
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                />

                <textarea
                  rows={3}
                  value={profitCreditNote}
                  onChange={(event) =>
                    setProfitCreditNote(
                      event.target.value
                    )
                  }
                  placeholder="Internal profit-credit note"
                  className="mt-3 w-full border border-white/10 bg-black p-4 text-sm text-white"
                />

                <button
                  type="submit"
                  disabled={workingAction !== null}
                  className="btn btn-primary mt-4 min-h-12 w-full gap-2"
                >
                  {workingAction === 'profit-credit' ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <TrendingUp size={16} />
                  )}
                  Credit Profit
                </button>
              </form>

              <section className="border border-white/10 bg-white/[0.025] p-6">
                {(selectedPortfolio?.totalPnl ?? 0) >= 0 ? (
                  <TrendingUp
                    size={18}
                    className="text-emerald-100"
                  />
                ) : (
                  <TrendingDown
                    size={18}
                    className="text-red-200"
                  />
                )}

                <h2 className="mt-4 text-xl font-semibold text-white">
                  Position Status
                </h2>

                <select
                  value={portfolioStatus}
                  onChange={(event) =>
                    setPortfolioStatus(
                      event.target.value as
                        | 'funding'
                        | 'active'
                        | 'closed'
                    )
                  }
                  className="mt-6 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white"
                >
                  <option value="funding">
                    Funding
                  </option>
                  <option value="active">
                    Active
                  </option>
                  <option value="closed">
                    Closed
                  </option>
                </select>

                <button
                  type="button"
                  disabled={workingAction !== null}
                  onClick={updateStatus}
                  className="btn btn-ghost mt-4 min-h-12 w-full gap-2"
                >
                  {workingAction === 'status' ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  Update Status
                </button>

                <div className="mt-6 border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/35">
                  Latest valuation:{' '}
                  {formatDate(
                    selectedPortfolio?.lastValuedAt ??
                      null
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="mt-6 border border-dashed border-white/15 p-16 text-center">
            <p className="text-sm text-white/40">
              No funded portfolio positions were found.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
