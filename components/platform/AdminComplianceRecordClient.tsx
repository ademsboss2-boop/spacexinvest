'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  FileText,
  History,
  MessageSquareText,
  ShieldCheck,
  UserRound
} from 'lucide-react'

export type AdminComplianceApplication = {
  id: string
  referenceCode: string
  applicantName: string
  applicantId: string
  amount: number
  status: string
  submittedAt: string
  updatedAt: string
  opportunity: {
    slug: string
    title: string
    category: string
  } | null
}

export type AdminAuditRecord = {
  id: string
  actionType: string
  previousStatus: string | null
  newStatus: string | null
  actorUserId: string | null
  actorName: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type AdminReviewNote = {
  id: string
  note: string
  authorUserId: string
  authorName: string
  createdAt: string
}

type AdminComplianceRecordClientProps = {
  application: AdminComplianceApplication
  auditRecords: AdminAuditRecord[]
  reviewNotes: AdminReviewNote[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
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

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

function actionLabel(value: string) {
  switch (value) {
    case 'baseline':
      return 'Baseline Record'

    case 'status_changed':
      return 'Status Changed'

    case 'note_added':
      return 'Internal Note Added'

    default:
      return formatStatus(value)
  }
}

function escapeCsv(value: unknown) {
  const text =
    value === null || value === undefined
      ? ''
      : String(value)

  return `"${text.replaceAll('"', '""')}"`
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

    case 'submitted':
      return 'border-amber-300/20 bg-amber-300/10 text-amber-100'

    default:
      return 'border-white/15 bg-white/[0.05] text-white/60'
  }
}

export default function AdminComplianceRecordClient({
  application,
  auditRecords,
  reviewNotes
}: AdminComplianceRecordClientProps) {
  const statusChanges = auditRecords.filter(
    (record) => record.actionType === 'status_changed'
  ).length

  const latestActivity = useMemo(() => {
    const timestamps = [
      ...auditRecords.map((record) => record.createdAt),
      ...reviewNotes.map((note) => note.createdAt)
    ]
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value))

    if (timestamps.length === 0) {
      return null
    }

    return new Date(Math.max(...timestamps)).toISOString()
  }, [auditRecords, reviewNotes])

  function downloadAuditCsv() {
    const headers = [
      'record_type',
      'application_reference',
      'application_status',
      'actor_name',
      'actor_user_id',
      'action_type',
      'previous_status',
      'new_status',
      'internal_note',
      'created_at',
      'metadata'
    ]

    const auditRows = auditRecords.map((record) => [
      'audit',
      application.referenceCode,
      application.status,
      record.actorName,
      record.actorUserId ?? '',
      record.actionType,
      record.previousStatus ?? '',
      record.newStatus ?? '',
      '',
      record.createdAt,
      JSON.stringify(record.metadata)
    ])

    const noteRows = reviewNotes.map((note) => [
      'internal_note',
      application.referenceCode,
      application.status,
      note.authorName,
      note.authorUserId,
      'note_added',
      '',
      '',
      note.note,
      note.createdAt,
      ''
    ])

    const csv = [
      headers,
      ...auditRows,
      ...noteRows
    ]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8'
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `${application.referenceCode}-compliance-audit.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()

    URL.revokeObjectURL(url)
  }

  const summaryCards = [
    {
      label: 'Audit Events',
      value: String(auditRecords.length),
      icon: History
    },
    {
      label: 'Status Changes',
      value: String(statusChanges),
      icon: FileClock
    },
    {
      label: 'Internal Notes',
      value: String(reviewNotes.length),
      icon: MessageSquareText
    },
    {
      label: 'Latest Activity',
      value: latestActivity
        ? formatDate(latestActivity)
        : 'No activity',
      icon: Clock3
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
          width={560}
          height={560}
          priority
          className="pointer-events-none absolute -bottom-44 -right-28 hidden w-[520px] object-contain opacity-35 lg:block"
        />

        <div className="relative mx-auto max-w-[1280px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Link
            href="/admin/applications"
            className="inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to application review
          </Link>

          <div className="mt-10 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/45">
            <span className="flex h-9 w-9 items-center justify-center border border-white/15 bg-black/30">
              <ShieldCheck size={16} aria-hidden="true" />
            </span>

            Restricted Compliance Record
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold uppercase leading-[0.93] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Audit Trail
            <span className="block text-white/45">
              {application.referenceCode}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
            Permanent administrative history, reviewer actions,
            status changes, and private internal notes for this
            application.
          </p>

          <button
            type="button"
            onClick={downloadAuditCsv}
            className="btn btn-primary mt-8 gap-3"
          >
            <Download size={16} aria-hidden="true" />
            Export Audit CSV
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="grid border border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, index) => {
            const Icon = card.icon

            return (
              <article
                key={card.label}
                className={[
                  'min-h-40 border-b border-white/10 bg-white/[0.025] p-6',
                  index % 2 === 0 ? 'sm:border-r' : '',
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

                <p className="mt-7 text-xl font-semibold text-white sm:text-2xl">
                  {card.value}
                </p>
              </article>
            )
          })}
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                Application Record
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                {application.opportunity?.title ??
                  'Investment Application'}
              </h2>

              <p className="mt-2 text-sm text-white/40">
                {application.opportunity?.category ??
                  'Investment'}
              </p>
            </div>

            <span
              className={`w-fit border px-3 py-2 text-xs uppercase tracking-[0.13em] ${statusClasses(
                application.status
              )}`}
            >
              {formatStatus(application.status)}
            </span>
          </div>

          <div className="mt-8 grid gap-6 border-t border-white/10 pt-7 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/30">
                <UserRound size={14} aria-hidden="true" />
                Applicant
              </div>

              <p className="mt-3 text-sm text-white/75">
                {application.applicantName}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                Requested Amount
              </p>

              <p className="mt-3 text-sm font-medium text-white/75">
                {formatCurrency(application.amount)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                Submitted
              </p>

              <p className="mt-3 text-sm leading-6 text-white/75">
                {formatDate(application.submittedAt)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                Last Updated
              </p>

              <p className="mt-3 text-sm leading-6 text-white/75">
                {formatDate(application.updatedAt)}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Immutable History
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Compliance Timeline
                </h2>
              </div>

              <History
                size={20}
                aria-hidden="true"
                className="text-white/35"
              />
            </div>

            {auditRecords.length ? (
              <div className="mt-7">
                {auditRecords.map((record, index) => (
                  <article
                    key={record.id}
                    className="relative grid grid-cols-[24px_1fr] gap-4"
                  >
                    <div className="relative flex justify-center">
                      <span className="relative z-10 mt-1.5 h-3 w-3 border border-white/40 bg-white" />

                      {index < auditRecords.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 top-4 w-px bg-white/15"
                        />
                      ) : null}
                    </div>

                    <div className="pb-9">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <h3 className="font-medium text-white">
                            {actionLabel(record.actionType)}
                          </h3>

                          <p className="mt-1 text-xs text-white/35">
                            {record.actorName}
                          </p>
                        </div>

                        <time className="text-xs text-white/30">
                          {formatDate(record.createdAt)}
                        </time>
                      </div>

                      {record.actionType ===
                        'status_changed' ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                          <span className="border border-white/10 bg-black/30 px-3 py-2 text-white/45">
                            {record.previousStatus
                              ? formatStatus(
                                  record.previousStatus
                                )
                              : 'Unknown'}
                          </span>

                          <span className="text-white/30">
                            →
                          </span>

                          <span className="border border-white/20 bg-white/[0.07] px-3 py-2 text-white">
                            {record.newStatus
                              ? formatStatus(record.newStatus)
                              : 'Unknown'}
                          </span>
                        </div>
                      ) : null}

                      {record.actionType === 'baseline' ? (
                        <p className="mt-4 text-sm leading-6 text-white/50">
                          Compliance baseline created with status{' '}
                          <span className="text-white/75">
                            {record.newStatus
                              ? formatStatus(record.newStatus)
                              : 'Unknown'}
                          </span>
                          .
                        </p>
                      ) : null}

                      {record.actionType === 'note_added' ? (
                        <p className="mt-4 text-sm leading-6 text-white/50">
                          A private internal review note was
                          appended to this application.
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-7 border border-dashed border-white/15 px-6 py-14 text-center">
                <FileText
                  size={28}
                  aria-hidden="true"
                  className="mx-auto text-white/25"
                />

                <p className="mt-4 text-sm text-white/40">
                  No audit history is available.
                </p>
              </div>
            )}
          </section>

          <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Authorized Staff Only
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Internal Review Notes
                </h2>
              </div>

              <MessageSquareText
                size={20}
                aria-hidden="true"
                className="text-white/35"
              />
            </div>

            {reviewNotes.length ? (
              <div className="mt-6 space-y-4">
                {reviewNotes.map((note) => (
                  <article
                    key={note.id}
                    className="border border-white/10 bg-black/35 p-5"
                  >
                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/65">
                      {note.note}
                    </p>

                    <div className="mt-5 flex flex-col justify-between gap-2 border-t border-white/10 pt-4 text-xs sm:flex-row">
                      <span className="text-white/45">
                        {note.authorName}
                      </span>

                      <time className="text-white/30">
                        {formatDate(note.createdAt)}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-7 border border-dashed border-white/15 px-6 py-14 text-center">
                <MessageSquareText
                  size={28}
                  aria-hidden="true"
                  className="mx-auto text-white/25"
                />

                <p className="mt-4 text-sm text-white/40">
                  No internal notes have been added.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-start gap-3 border border-white/10 bg-white/[0.025] p-4 text-xs leading-6 text-white/35">
              <CheckCircle2
                size={15}
                aria-hidden="true"
                className="mt-1 shrink-0"
              />

              These notes are restricted to authorized reviewers
              and administrators and are not visible to investors.
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
