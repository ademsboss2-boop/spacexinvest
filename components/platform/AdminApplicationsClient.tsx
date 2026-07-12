'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileSearch,
  Filter,
  Loader2,
  Search,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  UserRound,
  X,
  XCircle
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { createClient } from '../../lib/supabase/client'

export type ReviewStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'declined'
  | 'cancelled'

export type AdminApplication = {
  id: string
  amount: number
  status: ReviewStatus
  referenceCode: string
  submittedAt: string
  applicantId: string
  applicantName: string
  opportunity: {
    slug: string
    title: string
    category: string
  } | null
}

type AdminApplicationsClientProps = {
  initialApplications: AdminApplication[]
}

const STATUS_OPTIONS: Array<{
  value: ReviewStatus
  label: string
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' }
]

const REVIEW_DECISION_OPTIONS = STATUS_OPTIONS.filter(
  (status) => status.value !== 'draft'
)

const CHART_COLORS = [
  '#ffffff',
  '#a3a3a3',
  '#737373',
  '#525252',
  '#404040',
  '#262626'
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

function formatDate(value: string) {
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

function formatStatus(value: ReviewStatus) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function statusClasses(status: ReviewStatus) {
  switch (status) {
    case 'approved':
      return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'

    case 'under_review':
      return 'border-sky-300/20 bg-sky-300/10 text-sky-200'

    case 'declined':
    case 'cancelled':
      return 'border-red-300/20 bg-red-300/10 text-red-200'

    case 'submitted':
      return 'border-amber-300/20 bg-amber-300/10 text-amber-100'

    default:
      return 'border-white/15 bg-white/[0.05] text-white/55'
  }
}

export default function AdminApplicationsClient({
  initialApplications
}: AdminApplicationsClientProps) {
  const [applications, setApplications] =
    useState(initialApplications)

  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<string, ReviewStatus>
  >(() =>
    Object.fromEntries(
      initialApplications.map((application) => [
        application.id,
        application.status
      ])
    )
  )

  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  )

  const [errors, setErrors] = useState<Record<string, string>>(
    {}
  )

  const [messages, setMessages] = useState<
    Record<string, string>
  >({})

  const [statusFilter, setStatusFilter] = useState<
    'all' | ReviewStatus
  >('all')

  const [opportunityFilter, setOpportunityFilter] =
    useState('all')

  const [searchQuery, setSearchQuery] = useState('')

  const [reviewNotes, setReviewNotes] = useState<
    Record<string, string>
  >({})

  const analytics = useMemo(() => {
    const totalRequested = applications.reduce(
      (total, application) => total + application.amount,
      0
    )

    const activeReviews = applications.filter((application) =>
      ['submitted', 'under_review'].includes(
        application.status
      )
    ).length

    const approvedApplications = applications.filter(
      (application) => application.status === 'approved'
    )

    const declinedApplications = applications.filter(
      (application) => application.status === 'declined'
    )

    const approvedCapital = approvedApplications.reduce(
      (total, application) => total + application.amount,
      0
    )

    const decidedCount =
      approvedApplications.length +
      declinedApplications.length

    const approvalRate =
      decidedCount > 0
        ? (approvedApplications.length / decidedCount) * 100
        : 0

    const declineRate =
      decidedCount > 0
        ? (declinedApplications.length / decidedCount) * 100
        : 0

    return {
      totalRequested,
      activeReviews,
      approvedCapital,
      approvalRate,
      declineRate
    }
  }, [applications])

  const statusData = useMemo(
    () =>
      STATUS_OPTIONS.map((status) => ({
        name: status.label,
        value: applications.filter(
          (application) =>
            application.status === status.value
        ).length
      })).filter((item) => item.value > 0),
    [applications]
  )

  const opportunityData = useMemo(() => {
    const totals = new Map<
      string,
      {
        amount: number
        count: number
      }
    >()

    applications.forEach((application) => {
      const title =
        application.opportunity?.title ??
        'Unassigned Opportunity'

      const current = totals.get(title) ?? {
        amount: 0,
        count: 0
      }

      totals.set(title, {
        amount: current.amount + application.amount,
        count: current.count + 1
      })
    })

    return Array.from(totals.entries())
      .map(([name, values]) => ({
        name,
        amount: values.amount,
        count: values.count
      }))
      .sort((left, right) => right.amount - left.amount)
  }, [applications])

  const opportunityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          applications.map(
            (application) =>
              application.opportunity?.title ??
              'Unassigned Opportunity'
          )
        )
      ).sort((left, right) => left.localeCompare(right)),
    [applications]
  )

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort(
          (left, right) =>
            new Date(right.submittedAt).getTime() -
            new Date(left.submittedAt).getTime()
        )
        .slice(0, 5),
    [applications]
  )

  const visibleApplications = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return applications.filter((application) => {
      if (
        statusFilter !== 'all' &&
        application.status !== statusFilter
      ) {
        return false
      }

      const opportunityTitle =
        application.opportunity?.title ??
        'Unassigned Opportunity'

      if (
        opportunityFilter !== 'all' &&
        opportunityTitle !== opportunityFilter
      ) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const searchableValues = [
        application.applicantName,
        application.referenceCode,
        opportunityTitle,
        application.opportunity?.category ?? '',
        formatStatus(application.status)
      ]

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [
    applications,
    opportunityFilter,
    searchQuery,
    statusFilter
  ])

  const hasActiveFilters =
    statusFilter !== 'all' ||
    opportunityFilter !== 'all' ||
    searchQuery.trim().length > 0

  function clearFilters() {
    setStatusFilter('all')
    setOpportunityFilter('all')
    setSearchQuery('')
  }

  async function updateStatus(
    application: AdminApplication
  ) {
    const nextStatus =
      selectedStatuses[application.id] ??
      application.status

    const reviewNote =
      (reviewNotes[application.id] ?? '').trim()

    const statusChanged =
      nextStatus !== application.status

    if (!statusChanged && !reviewNote) {
      setMessages((current) => ({
        ...current,
        [application.id]:
          'Select a new status or enter an internal note.'
      }))
      return
    }

    setUpdatingId(application.id)

    setErrors((current) => ({
      ...current,
      [application.id]: ''
    }))

    setMessages((current) => ({
      ...current,
      [application.id]: ''
    }))

    const supabase = createClient()

    try {
      if (!statusChanged) {
        const { error } = await supabase.rpc(
          'add_application_review_note',
          {
            p_application_id: application.id,
            p_note: reviewNote
          }
        )

        if (error) {
          setErrors((current) => ({
            ...current,
            [application.id]:
              error.message ??
              'The internal review note could not be added.'
          }))
          return
        }

        setReviewNotes((current) => ({
          ...current,
          [application.id]: ''
        }))

        setMessages((current) => ({
          ...current,
          [application.id]:
            'Internal review note added successfully.'
        }))

        return
      }

      const { data, error } = await supabase.rpc(
        'review_application',
        {
          p_application_id: application.id,
          p_new_status: nextStatus,
          p_note: reviewNote || null
        }
      )

      const result = Array.isArray(data)
        ? data[0]
        : data

      if (error || !result) {
        setErrors((current) => ({
          ...current,
          [application.id]:
            error?.message ??
            'The application review could not be saved.'
        }))
        return
      }

      const updatedStatus =
        result.updated_status as ReviewStatus

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status: updatedStatus
              }
            : item
        )
      )

      setSelectedStatuses((current) => ({
        ...current,
        [application.id]: updatedStatus
      }))

      setReviewNotes((current) => ({
        ...current,
        [application.id]: ''
      }))

      setMessages((current) => ({
        ...current,
        [application.id]: reviewNote
          ? `Status updated to ${formatStatus(
              updatedStatus
            )}. Internal note added.`
          : `Status updated to ${formatStatus(
              updatedStatus
            )}.`
      }))
    } catch {
      setErrors((current) => ({
        ...current,
        [application.id]:
          'Something went wrong while saving the application review.'
      }))
    } finally {
      setUpdatingId(null)
    }
  }

  const summaryCards = [
    {
      label: 'Applications',
      value: String(applications.length),
      note: 'Total submitted records',
      icon: BriefcaseBusiness
    },
    {
      label: 'Requested Capital',
      value: formatCurrency(analytics.totalRequested),
      note: 'Across all applications',
      icon: TrendingUp
    },
    {
      label: 'Active Reviews',
      value: String(analytics.activeReviews),
      note: 'Submitted or under review',
      icon: Clock3
    },
    {
      label: 'Approved Capital',
      value: formatCurrency(analytics.approvedCapital),
      note: `${analytics.approvalRate.toFixed(1)}% decision approval rate`,
      icon: CheckCircle2
    }
  ]

  return (
    <div className="relative overflow-hidden bg-[#030303] pb-20">
      <section className="relative overflow-hidden border-b border-white/10">
        <Image
          src="/media/section-backgrounds/security-dragon.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/35"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30"
        />

        <Image
          src="/media/section-objects/security-station.png"
          alt=""
          width={580}
          height={580}
          priority
          className="pointer-events-none absolute -bottom-44 -right-28 hidden w-[540px] object-contain opacity-35 lg:block"
        />

        <div className="relative mx-auto max-w-[1380px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/45">
            <span className="flex h-9 w-9 items-center justify-center border border-white/15 bg-black/30">
              <ShieldCheck size={16} aria-hidden="true" />
            </span>

            Authorized Review Console
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Admin Analytics
            <span className="block text-white/45">
              & Application Review
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
            Review investor applications, analyze requested
            allocations, and manage application decisions from one
            secure administrative workspace.
          </p>
        </div>
      </section>

      <div className="relative mx-auto max-w-[1380px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section
          aria-label="Administrative summary"
          className="grid border border-white/10 sm:grid-cols-2 xl:grid-cols-4"
        >
          {summaryCards.map((card, index) => {
            const Icon = card.icon

            return (
              <article
                key={card.label}
                className={[
                  'min-h-44 border-b border-white/10 bg-white/[0.025] p-6',
                  index % 2 === 0 ? 'sm:border-r' : '',
                  index < summaryCards.length - 1
                    ? 'xl:border-r'
                    : '',
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

                <p className="mt-8 text-3xl font-semibold tracking-tight text-white">
                  {card.value}
                </p>

                <p className="mt-2 text-xs leading-5 text-white/35">
                  {card.note}
                </p>
              </article>
            )
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Review Pipeline
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Status Distribution
                  </h2>
                </div>

                <BarChart3
                  size={20}
                  aria-hidden="true"
                  className="text-white/35"
                />
              </div>

              {statusData.length ? (
                <div className="mt-6 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusData}
                      margin={{
                        top: 10,
                        right: 5,
                        left: -25,
                        bottom: 5
                      }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.08)"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: 'rgba(255,255,255,0.40)',
                          fontSize: 10
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fill: 'rgba(255,255,255,0.35)',
                          fontSize: 10
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        cursor={{
                          fill: 'rgba(255,255,255,0.04)'
                        }}
                        contentStyle={{
                          background: '#080808',
                          border:
                            '1px solid rgba(255,255,255,0.12)',
                          color: '#ffffff'
                        }}
                        labelStyle={{
                          color: 'rgba(255,255,255,0.6)'
                        }}
                      />

                      <Bar
                        dataKey="value"
                        name="Applications"
                        fill="#ffffff"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-6 flex h-72 items-center justify-center border border-dashed border-white/10 text-sm text-white/35">
                  No status data available
                </div>
              )}
            </article>

            <article className="border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Capital Distribution
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Opportunity Allocation
                  </h2>
                </div>

                <Activity
                  size={20}
                  aria-hidden="true"
                  className="text-white/35"
                />
              </div>

              {opportunityData.length ? (
                <>
                  <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={opportunityData}
                          dataKey="amount"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={3}
                          stroke="transparent"
                        >
                          {opportunityData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                CHART_COLORS[
                                  index % CHART_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>

                        <Tooltip
                          formatter={(value) =>
                            formatCurrency(Number(value))
                          }
                          contentStyle={{
                            background: '#080808',
                            border:
                              '1px solid rgba(255,255,255,0.12)',
                            color: '#ffffff'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 border-t border-white/10 pt-5">
                    {opportunityData
                      .slice(0, 4)
                      .map((opportunity, index) => (
                        <div
                          key={opportunity.name}
                          className="flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="h-2.5 w-2.5 shrink-0"
                              style={{
                                backgroundColor:
                                  CHART_COLORS[
                                    index %
                                      CHART_COLORS.length
                                  ]
                              }}
                            />

                            <span className="truncate text-white/45">
                              {opportunity.name}
                            </span>
                          </div>

                          <span className="shrink-0 text-white/75">
                            {formatCompactCurrency(
                              opportunity.amount
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div className="mt-6 flex h-72 items-center justify-center border border-dashed border-white/10 text-sm text-white/35">
                  No allocation data available
                </div>
              )}
            </article>
          </div>

          <aside className="border border-white/10 bg-white/[0.025] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Latest Intake
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Recent Submissions
                </h2>
              </div>

              <Clock3
                size={20}
                aria-hidden="true"
                className="text-white/35"
              />
            </div>

            {recentApplications.length ? (
              <div className="mt-6 divide-y divide-white/10">
                {recentApplications.map((application) => (
                  <article
                    key={application.id}
                    className="py-5 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {application.applicantName}
                        </p>

                        <p className="mt-1 truncate text-xs text-white/35">
                          {application.opportunity?.title ??
                            'Investment Application'}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${statusClasses(
                          application.status
                        )}`}
                      >
                        {formatStatus(application.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4 text-xs">
                      <span className="text-white/30">
                        {formatDate(application.submittedAt)}
                      </span>

                      <span className="font-medium text-white/70">
                        {formatCurrency(application.amount)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 border border-dashed border-white/10 px-5 py-12 text-center text-sm text-white/35">
                No recent submissions
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 border border-white/10">
              <div className="border-r border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Approval Rate
                </p>

                <p className="mt-2 text-xl font-semibold text-emerald-100">
                  {analytics.approvalRate.toFixed(1)}%
                </p>
              </div>

              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Decline Rate
                </p>

                <p className="mt-2 text-xl font-semibold text-red-100">
                  {analytics.declineRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/35">
                <Filter size={14} aria-hidden="true" />
                Review Filters
              </div>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                Application Search
              </h2>
            </div>

            <div className="text-sm text-white/35">
              Showing {visibleApplications.length} of{' '}
              {applications.length} applications
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px_260px_auto]">
            <div>
              <label
                htmlFor="application-search"
                className="sr-only"
              >
                Search applications
              </label>

              <div className="relative">
                <Search
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />

                <input
                  id="application-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Search applicant, reference, or opportunity"
                  className="min-h-12 w-full border border-white/10 bg-black/45 pl-12 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/35"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="application-status-filter"
                className="sr-only"
              >
                Filter by status
              </label>

              <select
                id="application-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | 'all'
                      | ReviewStatus
                  )
                }
                className="min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
              >
                <option value="all">All statuses</option>

                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="opportunity-filter"
                className="sr-only"
              >
                Filter by opportunity
              </label>

              <select
                id="opportunity-filter"
                value={opportunityFilter}
                onChange={(event) =>
                  setOpportunityFilter(event.target.value)
                }
                className="min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
              >
                <option value="all">All opportunities</option>

                {opportunityOptions.map((opportunity) => (
                  <option
                    key={opportunity}
                    value={opportunity}
                  >
                    {opportunity}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="btn btn-ghost min-h-12 gap-2 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <X size={15} aria-hidden="true" />
              Clear
            </button>
          </div>
        </section>

        {visibleApplications.length ? (
          <section className="mt-6 space-y-4">
            {visibleApplications.map((application) => {
              const selectedStatus =
                selectedStatuses[application.id] ??
                application.status

              const isUpdating =
                updatingId === application.id

              const hasChanged =
                selectedStatus !== application.status

              const reviewNote =
                reviewNotes[application.id] ?? ''

              const hasNote =
                reviewNote.trim().length > 0

              return (
                <article
                  key={application.id}
                  className="border border-white/10 bg-white/[0.025] p-5 sm:p-7"
                >
                  <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.13em] ${statusClasses(
                            application.status
                          )}`}
                        >
                          {formatStatus(application.status)}
                        </span>

                        <span className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                          {application.opportunity?.category ??
                            'Investment Application'}
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold text-white">
                        {application.opportunity?.title ??
                          'Investment Application'}
                      </h3>

                      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.13em] text-white/30">
                            <UserRound
                              size={13}
                              aria-hidden="true"
                            />
                            Applicant
                          </div>

                          <p className="mt-2 text-sm text-white/80">
                            {application.applicantName}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                            Requested Amount
                          </p>

                          <p className="mt-2 text-sm font-medium text-white">
                            {formatCurrency(application.amount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                            Submitted
                          </p>

                          <p className="mt-2 text-sm leading-6 text-white/70">
                            {formatDate(application.submittedAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                            Reference
                          </p>

                          <p className="mt-2 break-all font-mono text-xs leading-6 text-white/55">
                            {application.referenceCode}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-6 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
                      <label
                        htmlFor={`status-${application.id}`}
                        className="text-xs uppercase tracking-[0.14em] text-white/40"
                      >
                        Review decision
                      </label>

                      <select
                        id={`status-${application.id}`}
                        value={selectedStatus}
                        disabled={isUpdating}
                        onChange={(event) => {
                          const status = event.target
                            .value as ReviewStatus

                          setSelectedStatuses((current) => ({
                            ...current,
                            [application.id]: status
                          }))

                          setMessages((current) => ({
                            ...current,
                            [application.id]: ''
                          }))

                          setErrors((current) => ({
                            ...current,
                            [application.id]: ''
                          }))
                        }}
                        className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35 disabled:opacity-50"
                      >
                        {REVIEW_DECISION_OPTIONS.map((status) => (
                          <option
                            key={status.value}
                            value={status.value}
                          >
                            {status.label}
                          </option>
                        ))}
                      </select>

                      <label
                        htmlFor={`review-note-${application.id}`}
                        className="mt-6 block text-xs uppercase tracking-[0.14em] text-white/40"
                      >
                        Internal review note
                      </label>

                      <textarea
                        id={`review-note-${application.id}`}
                        value={reviewNote}
                        disabled={isUpdating}
                        maxLength={2000}
                        rows={4}
                        onChange={(event) => {
                          setReviewNotes((current) => ({
                            ...current,
                            [application.id]:
                              event.target.value
                          }))

                          setMessages((current) => ({
                            ...current,
                            [application.id]: ''
                          }))

                          setErrors((current) => ({
                            ...current,
                            [application.id]: ''
                          }))
                        }}
                        placeholder="Private note visible only to authorized reviewers"
                        className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-white/35 disabled:opacity-50"
                      />

                      <div className="mt-2 text-right text-[10px] text-white/25">
                        {reviewNote.length}/2000
                      </div>

                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          (!hasChanged && !hasNote)
                        }
                        onClick={() =>
                          updateStatus(application)
                        }
                        className="btn btn-primary mt-3 min-h-12 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2
                              size={16}
                              aria-hidden="true"
                              className="animate-spin"
                            />
                            Saving Review
                          </>
                        ) : hasChanged ? (
                          reviewNote.trim()
                            ? 'Update Status & Add Note'
                            : 'Update Status'
                        ) : (
                          'Add Internal Note'
                        )}
                      </button>

                      {errors[application.id] ? (
                        <div
                          role="alert"
                          className="mt-3 flex items-start gap-2 text-xs leading-5 text-red-300"
                        >
                          <XCircle
                            size={14}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0"
                          />

                          {errors[application.id]}
                        </div>
                      ) : null}

                      {messages[application.id] ? (
                        <div
                          role="status"
                          className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-100/70"
                        >
                          <CheckCircle2
                            size={14}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0"
                          />

                          {messages[application.id]}
                        </div>
                      ) : null}

                      <Link
                        href={`/admin/applications/${encodeURIComponent(
                          application.referenceCode
                        )}`}
                        className="btn btn-ghost mt-5 min-h-12 w-full gap-2"
                      >
                        <ScrollText
                          size={16}
                          aria-hidden="true"
                        />
                        View Audit Record
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        ) : (
          <section className="mt-6 border border-dashed border-white/15 px-6 py-16 text-center">
            <FileSearch
              size={30}
              aria-hidden="true"
              className="mx-auto text-white/25"
            />

            <h2 className="mt-5 text-xl font-medium text-white">
              No applications found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">
              No records match the current search and filter
              selections.
            </p>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-ghost mt-6"
              >
                Clear Filters
              </button>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}
