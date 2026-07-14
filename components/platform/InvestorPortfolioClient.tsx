'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  TrendingDown,
  TrendingUp,
  WalletCards
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

export type InvestorPortfolio = {
  positionId: string
  applicationId: string
  applicationReference: string
  opportunityTitle: string
  portfolioStatus: string

  fundedCapital: number
  currentValue: number

  incomeDistributions: number
  realizedProfitDistributions: number
  returnedCapital: number
  totalDistributions: number

  netInvestedCapital: number
  unrealizedPnl: number
  realizedPnl: number
  totalPnl: number
  roiPercentage: number

  lastValuedAt: string | null
}

type InvestorPortfolioClientProps = {
  portfolios: InvestorPortfolio[]
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

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Awaiting first valuation'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown valuation date'
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
    case 'active':
      return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'

    case 'closed':
      return 'border-white/10 bg-white/[0.04] text-white/40'

    default:
      return 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  }
}

export default function InvestorPortfolioClient({
  portfolios
}: InvestorPortfolioClientProps) {
  const totals = useMemo(() => {
    return portfolios.reduce(
      (summary, portfolio) => ({
        fundedCapital:
          summary.fundedCapital +
          portfolio.fundedCapital,

        currentValue:
          summary.currentValue +
          portfolio.currentValue,

        distributions:
          summary.distributions +
          portfolio.totalDistributions,

        totalPnl:
          summary.totalPnl +
          portfolio.totalPnl,

        activePositions:
          summary.activePositions +
          (portfolio.portfolioStatus === 'active'
            ? 1
            : 0)
      }),
      {
        fundedCapital: 0,
        currentValue: 0,
        distributions: 0,
        totalPnl: 0,
        activePositions: 0
      }
    )
  }, [portfolios])

  const totalRoi =
    totals.fundedCapital > 0
      ? (totals.totalPnl /
          totals.fundedCapital) *
        100
      : 0

  const chartData = useMemo(
    () =>
      portfolios.map((portfolio) => ({
        name:
          portfolio.opportunityTitle.length > 22
            ? `${portfolio.opportunityTitle.slice(
                0,
                22
              )}…`
            : portfolio.opportunityTitle,

        funded: portfolio.fundedCapital,
        value: portfolio.currentValue
      })),
    [portfolios]
  )

  const summaryCards = [
    {
      label: 'Verified Capital',
      value: currency(totals.fundedCapital),
      note: 'Finance-verified funding',
      icon: WalletCards
    },
    {
      label: 'Current Value',
      value: currency(totals.currentValue),
      note: 'Latest recorded valuations',
      icon: CircleDollarSign
    },
    {
      label: 'Total Return',
      value: currency(totals.totalPnl),
      note: `${percentage(totalRoi)} overall`,
      icon:
        totals.totalPnl >= 0
          ? TrendingUp
          : TrendingDown
    },
    {
      label: 'Active Positions',
      value: String(totals.activePositions),
      note: `${portfolios.length} total positions`,
      icon: BriefcaseBusiness
    }
  ]

  return (
    <div className="relative overflow-hidden bg-[#030303] pb-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[850px] bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.09),transparent_34%),radial-gradient(circle_at_15%_30%,rgba(70,100,140,0.10),transparent_30%)]"
      />

      <section className="relative border-b border-white/10">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
            <span className="flex h-9 w-9 items-center justify-center border border-white/15 bg-white/[0.03]">
              <Activity
                size={16}
                aria-hidden="true"
              />
            </span>

            Private Investor Portfolio
          </div>

          <div className="mt-6 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                Portfolio
                <span className="block text-white/40">
                  Performance
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
                Monitor verified capital, latest internal
                valuations, distributions, and investment
                performance across your funded positions.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="btn btn-ghost min-h-12"
              >
                Dashboard
              </Link>

              <Link
                href="/opportunities"
                className="btn btn-primary min-h-12 gap-2"
              >
                Explore Opportunities
                <ArrowUpRight
                  size={16}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-[1380px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section
          aria-label="Portfolio summary"
          className="grid border border-white/10 sm:grid-cols-2 xl:grid-cols-4"
        >
          {summaryCards.map((card, index) => {
            const Icon = card.icon

            return (
              <article
                key={card.label}
                className={[
                  'min-h-44 border-b border-white/10 bg-white/[0.025] p-6',
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

                <p
                  className={[
                    'mt-8 text-2xl font-semibold tracking-tight',
                    card.label === 'Total Return'
                      ? totals.totalPnl >= 0
                        ? 'text-emerald-100'
                        : 'text-red-200'
                      : 'text-white'
                  ].join(' ')}
                >
                  {card.value}
                </p>

                <p className="mt-2 text-xs text-white/35">
                  {card.note}
                </p>
              </article>
            )
          })}
        </section>

        {portfolios.length ? (
          <>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Capital Overview
                </p>

                <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <h2 className="text-2xl font-semibold text-white">
                    Funded Capital vs Current Value
                  </h2>

                  <p className="text-xs text-white/30">
                    Latest finance-recorded values
                  </p>
                </div>

                <div className="mt-8 h-[320px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 10,
                        right: 5,
                        bottom: 25,
                        left: 5
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="rgba(255,255,255,0.08)"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        stroke="rgba(255,255,255,0.30)"
                        tick={{
                          fill:
                            'rgba(255,255,255,0.42)',
                          fontSize: 11
                        }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        stroke="rgba(255,255,255,0.30)"
                        tick={{
                          fill:
                            'rgba(255,255,255,0.42)',
                          fontSize: 11
                        }}
                        tickFormatter={(value) =>
                          `$${Number(value).toLocaleString()}`
                        }
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip
                        cursor={{
                          fill:
                            'rgba(255,255,255,0.04)'
                        }}
                        contentStyle={{
                          background: '#090909',
                          border:
                            '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 0
                        }}
                        labelStyle={{
                          color:
                            'rgba(255,255,255,0.65)'
                        }}
                        itemStyle={{
                          color: '#ffffff'
                        }}
                        formatter={(value) =>
                          currency(Number(value))
                        }
                      />

                      <Bar
                        dataKey="funded"
                        name="Verified Capital"
                        fill="rgba(255,255,255,0.28)"
                        radius={[2, 2, 0, 0]}
                      />

                      <Bar
                        dataKey="value"
                        name="Current Value"
                        fill="rgba(255,255,255,0.88)"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Return Summary
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Portfolio Accounting
                </h2>

                <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
                  <div className="flex justify-between gap-4 py-5">
                    <span className="text-sm text-white/40">
                      Verified capital
                    </span>

                    <span className="text-sm font-medium text-white">
                      {currency(totals.fundedCapital)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-5">
                    <span className="text-sm text-white/40">
                      Current value
                    </span>

                    <span className="text-sm font-medium text-white">
                      {currency(totals.currentValue)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-5">
                    <span className="text-sm text-white/40">
                      Total distributions
                    </span>

                    <span className="text-sm font-medium text-white">
                      {currency(totals.distributions)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-5">
                    <span className="text-sm text-white/40">
                      Net return
                    </span>

                    <span
                      className={[
                        'text-sm font-medium',
                        totals.totalPnl >= 0
                          ? 'text-emerald-100'
                          : 'text-red-200'
                      ].join(' ')}
                    >
                      {currency(totals.totalPnl)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-5">
                    <span className="text-sm text-white/40">
                      Overall ROI
                    </span>

                    <span
                      className={[
                        'text-sm font-medium',
                        totalRoi >= 0
                          ? 'text-emerald-100'
                          : 'text-red-200'
                      ].join(' ')}
                    >
                      {percentage(totalRoi)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 border border-white/10 bg-black/25 p-4 text-xs leading-6 text-white/35">
                  Portfolio values are maintained by the finance team
                  and are not live market quotations.
                </div>
              </section>
            </div>

            <section className="mt-6 border border-white/10 bg-white/[0.025] p-5 sm:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Funded Positions
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Investment Portfolio
                  </h2>
                </div>

                <p className="text-sm text-white/35">
                  {portfolios.length}{' '}
                  {portfolios.length === 1
                    ? 'position'
                    : 'positions'}
                </p>
              </div>

              <div className="mt-7 space-y-5">
                {portfolios.map((portfolio) => {
                  const positive =
                    portfolio.totalPnl >= 0

                  return (
                    <article
                      key={portfolio.positionId}
                      className="border border-white/10 bg-black/30 p-5 sm:p-6"
                    >
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-medium text-white">
                              {portfolio.opportunityTitle}
                            </h3>

                            <span
                              className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClasses(
                                portfolio.portfolioStatus
                              )}`}
                            >
                              {formatStatus(
                                portfolio.portfolioStatus
                              )}
                            </span>
                          </div>

                          <p className="mt-3 font-mono text-xs text-white/30">
                            {
                              portfolio.applicationReference
                            }
                          </p>
                        </div>

                        <div className="lg:text-right">
                          <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                            Current Value
                          </p>

                          <p className="mt-2 text-2xl font-semibold text-white">
                            {currency(
                              portfolio.currentValue
                            )}
                          </p>

                          <p
                            className={[
                              'mt-2 text-sm',
                              positive
                                ? 'text-emerald-100'
                                : 'text-red-200'
                            ].join(' ')}
                          >
                            {currency(
                              portfolio.totalPnl
                            )}{' '}
                            ·{' '}
                            {percentage(
                              portfolio.roiPercentage
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 border-y border-white/10 py-5 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                            Funded Capital
                          </p>

                          <p className="mt-2 text-sm font-medium text-white">
                            {currency(
                              portfolio.fundedCapital
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                            Unrealized P&amp;L
                          </p>

                          <p className="mt-2 text-sm font-medium text-white">
                            {currency(
                              portfolio.unrealizedPnl
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                            Realized P&amp;L
                          </p>

                          <p className="mt-2 text-sm font-medium text-white">
                            {currency(
                              portfolio.realizedPnl
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                            Distributions
                          </p>

                          <p className="mt-2 text-sm font-medium text-white">
                            {currency(
                              portfolio.totalDistributions
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <Clock3
                            size={14}
                            aria-hidden="true"
                          />

                          {formatDate(
                            portfolio.lastValuedAt
                          )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Link
                            href={`/dashboard/funding/${encodeURIComponent(
                              portfolio.applicationReference
                            )}`}
                            className="btn btn-ghost min-h-11"
                          >
                            Funding History
                          </Link>

                          <Link
                            href={`/dashboard/applications/${encodeURIComponent(
                              portfolio.applicationReference
                            )}`}
                            className="btn btn-primary min-h-11 gap-2"
                          >
                            Application
                            <ArrowUpRight
                              size={15}
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </>
        ) : (
          <section className="mt-6 border border-dashed border-white/15 bg-white/[0.02] px-6 py-20 text-center">
            <BriefcaseBusiness
              size={34}
              aria-hidden="true"
              className="mx-auto text-white/25"
            />

            <h2 className="mt-5 text-xl font-semibold text-white">
              No funded positions yet
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-white/40">
              A portfolio position will appear after Finance
              verifies credited capital for an approved
              application.
            </p>

            <Link
              href="/dashboard"
              className="btn btn-primary mt-7"
            >
              Return to Dashboard
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
