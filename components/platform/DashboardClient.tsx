'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { OPPORTUNITIES } from '../../lib/opportunities'

export type DashboardApplication = {
  id: string
  amount: number
  status: string
  referenceCode: string
  submittedAt: string
  opportunity: {
    slug: string
    title: string
    category: string
  } | null
}

export type SavedOpportunity = {
  savedAt: string
  opportunity: {
    slug: string
    title: string
    category: string
    status: string
    minimumInvestment: number
  } | null
}

type DashboardClientProps = {
  displayName: string
  applications: DashboardApplication[]
  savedOpportunities: SavedOpportunity[]
}

const CHART_COLORS = [
  '#f5f5f5',
  '#b6b6b6',
  '#737373',
  '#404040',
  '#262626'
]

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

function formatStatus(status: string) {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value))
}

export default function DashboardClient({
  displayName,
  applications,
  savedOpportunities
}: DashboardClientProps) {
  const totalRequested = applications.reduce(
    (total, application) => total + application.amount,
    0
  )

  const approvedAmount = applications
    .filter((application) => application.status === 'approved')
    .reduce((total, application) => total + application.amount, 0)

  const activeApplications = applications.filter((application) =>
    ['submitted', 'under_review', 'approved'].includes(
      application.status
    )
  ).length

  const chartData = useMemo(() => {
    const totals = new Map<string, number>()

    applications.forEach((application) => {
      const title =
        application.opportunity?.title ?? 'Unassigned Opportunity'

      totals.set(title, (totals.get(title) ?? 0) + application.amount)
    })

    return Array.from(totals.entries()).map(([name, amount]) => ({
      name,
      amount
    }))
  }, [applications])

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 md:py-16">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Investor Dashboard
          </p>

          <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white md:text-6xl">
            Welcome, {displayName}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">
            Review your investment applications, their current status, and
            available opportunities.
          </p>
        </div>

        <Link href="/opportunities" className="btn btn-primary">
          Browse Opportunities
        </Link>
      </div>

      <section
        aria-label="Application summary"
        className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ['Total Requested', currency(totalRequested), 'Across all applications'],
          ['Applications', String(applications.length), 'Total submitted'],
          ['Active Reviews', String(activeApplications), 'Open applications'],
          ['Approved Amount', currency(approvedAmount), 'Approved allocations']
        ].map(([label, value, note]) => (
          <div
            key={label}
            className="border border-white/10 bg-white/5 p-6 backdrop-blur-md"
          >
            <div className="text-xs uppercase tracking-[0.16em] text-white/40">
              {label}
            </div>

            <div className="mt-5 text-3xl font-semibold text-white">
              {value}
            </div>

            <div className="mt-2 text-xs text-white/35">{note}</div>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">
              Applications
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Investment Activity
            </h2>
          </div>

          {applications.length ? (
            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {applications.map((application) => (
                <article
                  key={application.id}
                  className="grid gap-5 py-6 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/35">
                      {application.opportunity?.category ?? 'Investment'}
                    </div>

                    <h3 className="mt-2 font-medium text-white">
                      {application.opportunity?.title ??
                        'Investment Application'}
                    </h3>

                    <p className="mt-2 text-xs text-white/40">
                      Submitted {formatDate(application.submittedAt)}
                    </p>

                    <p className="mt-1 font-mono text-xs text-white/30">
                      {application.referenceCode}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-lg font-semibold text-white">
                      {currency(application.amount)}
                    </div>

                    <span className="mt-2 inline-block border border-white/15 bg-white/5 px-3 py-1 text-xs capitalize text-white/60">
                      {formatStatus(application.status)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-dashed border-white/15 px-6 py-12 text-center">
              <h3 className="text-lg font-medium text-white">
                No investment applications yet
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/45">
                Browse the available opportunities and submit your first
                investment application.
              </p>

              <Link
                href="/opportunities"
                className="btn btn-primary mt-6"
              >
                Explore Opportunities
              </Link>
            </div>
          )}
        </section>

        <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Requested Allocation
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Application Distribution
          </h2>

          {chartData.length ? (
            <>
              <div
                className="mt-6 h-64"
                role="img"
                aria-label="Chart showing requested investment amounts by opportunity."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={96}
                      paddingAngle={2}
                      stroke="transparent"
                    >
                      {chartData.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={
                            CHART_COLORS[index % CHART_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        currency(Number(value))
                      }
                      contentStyle={{
                        background: '#080808',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 0,
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-3">
                {chartData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0"
                        style={{
                          backgroundColor:
                            CHART_COLORS[
                              index % CHART_COLORS.length
                            ]
                        }}
                      />

                      <span className="truncate text-white/55">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-white">
                      {currency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-8 flex h-64 items-center justify-center border border-dashed border-white/15 text-center text-sm text-white/40">
              Allocation data will appear after an application is submitted.
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">
              Watchlist
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Saved Opportunities
            </h2>
          </div>

          <div className="text-sm text-white/40">
            {savedOpportunities.length}{' '}
            {savedOpportunities.length === 1 ? 'opportunity' : 'opportunities'}
          </div>
        </div>

        {savedOpportunities.length ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedOpportunities.map((saved) => {
              if (!saved.opportunity) return null

              return (
                <Link
                  key={saved.opportunity.slug}
                  href={`/opportunities/${saved.opportunity.slug}`}
                  className="group block border border-white/10 bg-black/25 p-5 transition-colors hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                      {saved.opportunity.category}
                    </div>

                    <span className="border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/40">
                      {saved.opportunity.status}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-medium text-white transition-colors group-hover:text-white/80">
                    {saved.opportunity.title}
                  </h3>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-white/35">
                      Minimum Investment
                    </div>

                    <div className="mt-2 font-medium text-white">
                      {currency(saved.opportunity.minimumInvestment)}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-white/30">
                    Saved {formatDate(saved.savedAt)}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="mt-7 border border-dashed border-white/15 px-6 py-10 text-center">
            <h3 className="text-lg font-medium text-white">
              Your watchlist is empty
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/45">
              Save opportunities that you want to review again later.
            </p>

            <Link href="/opportunities" className="btn btn-primary mt-6">
              Browse Opportunities
            </Link>
          </div>
        )}
      </section>

      <section className="mt-6 border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
          Available Opportunities
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-white">
          Continue Exploring
        </h2>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {OPPORTUNITIES.map((opportunity) => (
            <Link
              key={opportunity.slug}
              href={`/opportunities/${opportunity.slug}`}
              className="block border border-white/10 bg-black/25 p-5 transition-colors hover:bg-white/10"
            >
              <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                {opportunity.category}
              </div>

              <div className="mt-2 font-medium text-white">
                {opportunity.title}
              </div>

              <div className="mt-2 text-sm text-white/45">
                Minimum {opportunity.formattedMinimum}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
