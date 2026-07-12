'use client'

import React, { useMemo, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export type ReviewStatus =
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
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' }
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
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

function formatStatus(value: ReviewStatus) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
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

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | ReviewStatus>('all')

  const visibleApplications = useMemo(() => {
    if (filter === 'all') {
      return applications
    }

    return applications.filter(
      (application) => application.status === filter
    )
  }, [applications, filter])

  const pendingCount = applications.filter((application) =>
    ['submitted', 'under_review'].includes(application.status)
  ).length

  async function updateStatus(application: AdminApplication) {
    const nextStatus =
      selectedStatuses[application.id] ?? application.status

    if (nextStatus === application.status) {
      setMessages((current) => ({
        ...current,
        [application.id]: 'No status change selected.'
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
      const { data, error } = await supabase
        .from('investment_applications')
        .update({
          status: nextStatus
        })
        .eq('id', application.id)
        .select('id, status')
        .single()

      if (error || !data) {
        setErrors((current) => ({
          ...current,
          [application.id]:
            error?.message ??
            'The application status could not be updated.'
        }))
        return
      }

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status: data.status as ReviewStatus
              }
            : item
        )
      )

      setMessages((current) => ({
        ...current,
        [application.id]: `Status updated to ${formatStatus(
          data.status as ReviewStatus
        )}.`
      }))
    } catch {
      setErrors((current) => ({
        ...current,
        [application.id]:
          'Something went wrong while updating the application.'
      }))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 md:py-16">
      <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            Administration
          </p>

          <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white md:text-6xl">
            Application Review
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
            Review submitted investment applications and update their
            current status.
          </p>
        </div>

        <div className="border border-white/10 bg-white/5 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/35">
            Pending Review
          </div>

          <div className="mt-2 text-2xl font-semibold text-white">
            {pendingCount}
          </div>
        </div>
      </div>

      <section className="mt-8 border border-white/10 bg-white/5 p-5">
        <label
          htmlFor="application-filter"
          className="text-xs uppercase tracking-[0.16em] text-white/40"
        >
          Filter applications
        </label>

        <select
          id="application-filter"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as 'all' | ReviewStatus)
          }
          className="mt-3 min-h-11 w-full border border-white/15 bg-black px-4 text-sm text-white focus:border-white/40 focus:outline-none sm:w-64"
        >
          <option value="all">All applications</option>

          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </section>

      {visibleApplications.length ? (
        <section className="mt-6 space-y-4">
          {visibleApplications.map((application) => {
            const selectedStatus =
              selectedStatuses[application.id] ?? application.status

            const isUpdating = updatingId === application.id
            const hasChanged = selectedStatus !== application.status

            return (
              <article
                key={application.id}
                className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8"
              >
                <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/60">
                        {formatStatus(application.status)}
                      </span>

                      <span className="text-xs uppercase tracking-[0.14em] text-white/35">
                        {application.opportunity?.category ??
                          'Investment Application'}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold text-white">
                      {application.opportunity?.title ??
                        'Investment Application'}
                    </h2>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-white/35">
                          Applicant
                        </div>

                        <div className="mt-2 text-sm text-white">
                          {application.applicantName}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-white/35">
                          Requested Amount
                        </div>

                        <div className="mt-2 text-sm font-medium text-white">
                          {formatCurrency(application.amount)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-white/35">
                          Submitted
                        </div>

                        <div className="mt-2 text-sm text-white">
                          {formatDate(application.submittedAt)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-white/35">
                          Reference
                        </div>

                        <div className="mt-2 break-all font-mono text-xs text-white/60">
                          {application.referenceCode}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-64">
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
                      }}
                      className="mt-3 min-h-11 w-full border border-white/15 bg-black px-4 text-sm text-white focus:border-white/40 focus:outline-none disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isUpdating || !hasChanged}
                      onClick={() => updateStatus(application)}
                      className="btn btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isUpdating ? 'Updating…' : 'Update Status'}
                    </button>

                    {errors[application.id] ? (
                      <p
                        role="alert"
                        className="mt-3 text-xs leading-relaxed text-red-300"
                      >
                        {errors[application.id]}
                      </p>
                    ) : null}

                    {messages[application.id] ? (
                      <p
                        role="status"
                        className="mt-3 text-xs leading-relaxed text-white/50"
                      >
                        {messages[application.id]}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="mt-6 border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium text-white">
            No applications found
          </h2>

          <p className="mt-3 text-sm text-white/45">
            There are no applications matching the selected filter.
          </p>
        </section>
      )}
    </div>
  )
}
