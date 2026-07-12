'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Orbit,
  Rocket,
  ShieldCheck
} from 'lucide-react'
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
  email: string
  applications: DashboardApplication[]
  savedOpportunities: SavedOpportunity[]
}

const CHART_COLORS = [
  '#ffffff',
  '#a3a3a3',
  '#666666',
  '#3f3f46',
  '#27272a'
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

function statusClasses(status: string) {
  switch (status) {
    case 'approved':
      return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'

    case 'under_review':
      return 'border-sky-300/20 bg-sky-300/10 text-sky-200'

    case 'declined':
    case 'cancelled':
      return 'border-red-300/20 bg-red-300/10 text-red-200'

    default:
      return 'border-white/15 bg-white/[0.06] text-white/60'
  }
}

export default function DashboardClient({
  displayName,
  email,
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

  const pendingApplications = applications.filter((application) =>
    ['submitted', 'under_review'].includes(application.status)
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

  const summaryCards = [
    {
      label: 'Requested Capital',
      value: currency(totalRequested),
      note: 'Across all applications',
      icon: BriefcaseBusiness
    },
    {
      label: 'Active Reviews',
      value: String(pendingApplications),
      note: 'Pending decisions',
      icon: Clock3
    },
    {
      label: 'Approved Capital',
      value: currency(approvedAmount),
      note: 'Approved allocations',
      icon: CheckCircle2
    },
    {
      label: 'Saved Opportunities',
      value: String(savedOpportunities.length),
      note: 'In your watchlist',
      icon: Bookmark
    }
  ]

  return (
    <div className="relative overflow-hidden bg-[#030303] pb-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(circle_at_75%_0%,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_15%_20%,rgba(70,100,140,0.12),transparent_28%)]"
      />

      <div className="relative mx-auto max-w-[1380px] px-4 pt-5 sm:px-6 lg:px-8">
        <section className="relative min-h-[430px] overflow-hidden border border-white/10 bg-[#080808]">
          <Image
            src="/media/astronaut.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-45"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/20"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/35"
          />

          <Image
            src="/media/section-objects/overview-moon.png"
            alt=""
            width={390}
            height={390}
            className="pointer-events-none absolute -bottom-32 -right-24 hidden opacity-35 lg:block"
          />

          <div className="relative z-10 flex min-h-[430px] flex-col justify-between p-6 sm:p-9 lg:p-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/50">
                <span className="flex h-8 w-8 items-center justify-center border border-white/15 bg-black/30">
                  <Orbit size={15} aria-hidden="true" />
                </span>

                Private Investor Portal
              </div>

              <div className="flex items-center gap-2 border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-2 text-xs text-emerald-200/80">
                <ShieldCheck size={14} aria-hidden="true" />
                Secure session active
              </div>
            </div>

            <div className="grid items-end gap-10 lg:grid-cols-[1fr_340px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Portfolio Command Center
                </p>

                <h1 className="mt-4 max-w-4xl text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                  Welcome back,
                  <span className="block text-white/45">
                    {displayName}
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
                  Monitor investment applications, review capital
                  allocations, and continue exploring private opportunities.
                </p>
              </div>

              <div className="border border-white/10 bg-black/50 p-5 backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Account
                </div>

                <div className="mt-4 truncate text-sm font-medium text-white">
                  {email}
                </div>

                <div className="mt-2 text-xs text-white/40">
                  Verified investor access
                </div>

                <Link
                  href="/opportunities"
                  className="btn btn-primary mt-6 w-full"
                >
                  Explore Opportunities
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Portfolio summary"
          className="relative z-20 -mt-px grid border-x border-white/10 sm:grid-cols-2 xl:grid-cols-4"
        >
          {summaryCards.map((card, index) => {
            const Icon = card.icon

            return (
              <article
                key={card.label}
                className={[
                  'group relative min-h-44 border-b border-white/10 bg-black/85 p-6 backdrop-blur-xl transition-colors hover:bg-white/[0.055]',
                  index < summaryCards.length - 1
                    ? 'xl:border-r'
                    : '',
                  index % 2 === 0 ? 'sm:border-r xl:border-r' : ''
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    {card.label}
                  </p>

                  <Icon
                    size={18}
                    aria-hidden="true"
                    className="text-white/35 transition-colors group-hover:text-white"
                  />
                </div>

                <p className="mt-8 text-3xl font-semibold tracking-tight text-white">
                  {card.value}
                </p>

                <p className="mt-2 text-xs text-white/35">
                  {card.note}
                </p>
              </article>
            )
          })}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          <section className="border border-white/10 bg-[#080808]/95 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Applications
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Investment Activity
                </h2>
              </div>

              <div className="text-sm text-white/35">
                {applications.length}{' '}
                {applications.length === 1 ? 'record' : 'records'}
              </div>
            </div>

            {applications.length ? (
              <div className="divide-y divide-white/10">
                {applications.map((application) => (
                  <Link
                    key={application.id}
                    href={`/dashboard/applications/${encodeURIComponent(
                      application.referenceCode
                    )}`}
                    className="group grid gap-5 py-6 transition-colors sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
                          {application.opportunity?.category ??
                            'Investment'}
                        </span>

                        <span
                          className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClasses(
                            application.status
                          )}`}
                        >
                          {formatStatus(application.status)}
                        </span>
                      </div>

                      <h3 className="mt-3 truncate text-lg font-medium text-white transition-colors group-hover:text-white/70">
                        {application.opportunity?.title ??
                          'Investment Application'}
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/35">
                        <span>
                          Submitted {formatDate(application.submittedAt)}
                        </span>

                        <span className="font-mono">
                          {application.referenceCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div className="text-lg font-semibold text-white">
                          {currency(application.amount)}
                        </div>

                        <div className="mt-1 text-xs text-white/30">
                          Requested amount
                        </div>
                      </div>

                      <span className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.03] text-white/50 transition-all group-hover:border-white/25 group-hover:bg-white/10 group-hover:text-white">
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8 border border-dashed border-white/15 px-6 py-14 text-center">
                <FileText
                  size={28}
                  aria-hidden="true"
                  className="mx-auto text-white/25"
                />

                <h3 className="mt-5 text-lg font-medium text-white">
                  No applications yet
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/40">
                  Submit an investment application to begin tracking its
                  review status here.
                </p>

                <Link href="/opportunities" className="btn btn-primary mt-6">
                  Explore Opportunities
                </Link>
              </div>
            )}
          </section>

          <section className="border border-white/10 bg-[#080808]/95 p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Capital Distribution
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Requested Allocation
            </h2>

            {chartData.length ? (
              <>
                <div
                  className="relative mt-4 h-72"
                  role="img"
                  aria-label="Chart showing requested investment amounts by opportunity."
                >
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                      Total
                    </span>

                    <span className="mt-2 text-xl font-semibold text-white">
                      {currency(totalRequested)}
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={78}
                        outerRadius={108}
                        paddingAngle={3}
                        stroke="transparent"
                      >
                        {chartData.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={
                              CHART_COLORS[
                                index % CHART_COLORS.length
                              ]
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value) => currency(Number(value))}
                        contentStyle={{
                          background: '#050505',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 0,
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3 border-t border-white/10 pt-5">
                  {chartData.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0"
                          style={{
                            backgroundColor:
                              CHART_COLORS[
                                index % CHART_COLORS.length
                              ]
                          }}
                        />

                        <span className="truncate text-white/45">
                          {item.name}
                        </span>
                      </div>

                      <span className="font-medium text-white">
                        {currency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-8 flex h-72 flex-col items-center justify-center border border-dashed border-white/15 px-6 text-center">
                <Orbit
                  size={32}
                  aria-hidden="true"
                  className="text-white/20"
                />

                <p className="mt-4 text-sm leading-6 text-white/40">
                  Allocation analytics will appear after your first
                  application.
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 border border-white/10 bg-[#080808]/95 p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Personal Watchlist
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Saved Opportunities
              </h2>
            </div>

            <Link
              href="/opportunities"
              className="text-sm text-white/45 transition-colors hover:text-white"
            >
              Browse all opportunities →
            </Link>
          </div>

          {savedOpportunities.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedOpportunities.map((saved, index) => {
                if (!saved.opportunity) return null

                return (
                  <Link
                    key={saved.opportunity.slug}
                    href={`/opportunities/${saved.opportunity.slug}`}
                    className="group relative min-h-64 overflow-hidden border border-white/10 bg-black"
                  >
                    <Image
                      src={
                        index % 2 === 0
                          ? '/media/section-backgrounds/opportunities-falcon.jpg'
                          : '/media/section-backgrounds/overview-earth.jpg'
                      }
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover opacity-35 transition duration-700 group-hover:scale-105 group-hover:opacity-45"
                    />

                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20"
                    />

                    <div className="relative flex min-h-64 flex-col justify-between p-6">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                          {saved.opportunity.category}
                        </span>

                        <span className="border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/50 backdrop-blur-md">
                          {saved.opportunity.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-medium leading-tight text-white">
                          {saved.opportunity.title}
                        </h3>

                        <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                              Minimum
                            </p>

                            <p className="mt-2 font-medium text-white">
                              {currency(
                                saved.opportunity.minimumInvestment
                              )}
                            </p>
                          </div>

                          <ArrowUpRight
                            size={18}
                            aria-hidden="true"
                            className="text-white/40 transition-colors group-hover:text-white"
                          />
                        </div>

                        <p className="mt-3 text-xs text-white/25">
                          Saved {formatDate(saved.savedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-white/15 px-6 py-14 text-center">
              <Bookmark
                size={28}
                aria-hidden="true"
                className="mx-auto text-white/20"
              />

              <h3 className="mt-5 text-lg font-medium text-white">
                Your watchlist is empty
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/40">
                Save opportunities you want to compare or review later.
              </p>

              <Link href="/opportunities" className="btn btn-primary mt-6">
                Browse Opportunities
              </Link>
            </div>
          )}
        </section>

        <section className="relative mt-6 overflow-hidden border border-white/10 bg-[#080808]">
          <Image
            src="/media/section-backgrounds/security-dragon.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-25"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/40"
          />

          <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_1.4fr] lg:p-12">
            <div>
              <div className="flex h-12 w-12 items-center justify-center border border-white/15 bg-white/[0.05]">
                <Rocket size={20} aria-hidden="true" />
              </div>

              <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/35">
                Continue Exploring
              </p>

              <h2 className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-tight text-white sm:text-4xl">
                New capital opportunities
              </h2>

              <p className="mt-4 max-w-md text-sm leading-7 text-white/45">
                Review available opportunities and submit a new capital
                allocation request.
              </p>
            </div>

            <div className="grid gap-3">
              {OPPORTUNITIES.map((opportunity) => (
                <Link
                  key={opportunity.slug}
                  href={`/opportunities/${opportunity.slug}`}
                  className="group flex items-center justify-between gap-5 border border-white/10 bg-black/45 p-5 backdrop-blur-md transition-colors hover:bg-white/[0.08]"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                      {opportunity.category}
                    </p>

                    <h3 className="mt-2 truncate font-medium text-white">
                      {opportunity.title}
                    </h3>

                    <p className="mt-2 text-xs text-white/35">
                      Minimum {opportunity.formattedMinimum}
                    </p>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 text-white/40 transition-all group-hover:border-white/25 group-hover:text-white">
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
