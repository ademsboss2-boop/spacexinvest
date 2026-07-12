'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  Bell,
  BellRing,
  CheckCheck,
  Clock3,
  FileText,
  Loader2
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export type InvestorActivity = {
  id: string
  eventType: string
  message: string
  createdAt: string
  readAt: string | null
  application: {
    referenceCode: string
    status: string
    opportunity: {
      title: string
      category: string
    } | null
  } | null
}

type InvestorActivityClientProps = {
  initialActivities: InvestorActivity[]
}

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
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
      return 'border-white/15 bg-white/[0.05] text-white/55'
  }
}

export default function InvestorActivityClient({
  initialActivities
}: InvestorActivityClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [activities, setActivities] =
    useState(initialActivities)

  const [markingAll, setMarkingAll] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState('')

  const unreadCount = useMemo(
    () =>
      activities.filter((activity) => !activity.readAt).length,
    [activities]
  )

  const latestActivity = activities[0]?.createdAt ?? null

  function notifyHeader() {
    window.dispatchEvent(
      new Event('spacexinvest:activity-changed')
    )
  }

  async function markActivityRead(activityId: string) {
    const activity = activities.find(
      (item) => item.id === activityId
    )

    if (!activity || activity.readAt) {
      return true
    }

    const { data, error } = await supabase.rpc(
      'mark_application_activity_read',
      {
        activity_id: activityId
      }
    )

    if (error || data !== true) {
      return false
    }

    const readAt = new Date().toISOString()

    setActivities((current) =>
      current.map((item) =>
        item.id === activityId
          ? {
              ...item,
              readAt
            }
          : item
      )
    )

    notifyHeader()
    return true
  }

  async function handleOpenActivity(
    activity: InvestorActivity
  ) {
    setOpeningId(activity.id)
    setErrorMessage('')

    await markActivityRead(activity.id)

    const referenceCode =
      activity.application?.referenceCode

    if (referenceCode) {
      router.push(
        `/dashboard/applications/${encodeURIComponent(
          referenceCode
        )}`
      )

      return
    }

    setOpeningId(null)
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || markingAll) return

    setMarkingAll(true)
    setErrorMessage('')

    const { error } = await supabase.rpc(
      'mark_all_application_activity_read'
    )

    if (error) {
      setErrorMessage(
        'We could not mark your activity as read. Please try again.'
      )
      setMarkingAll(false)
      return
    }

    const readAt = new Date().toISOString()

    setActivities((current) =>
      current.map((activity) => ({
        ...activity,
        readAt: activity.readAt ?? readAt
      }))
    )

    notifyHeader()
    setMarkingAll(false)
  }

  return (
    <div className="relative overflow-hidden bg-[#030303] pb-20">
      <section className="relative overflow-hidden border-b border-white/10">
        <Image
          src="/media/section-backgrounds/overview-earth.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/35"
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
          className="pointer-events-none absolute -bottom-44 -right-28 hidden w-[520px] object-contain opacity-45 lg:block"
        />

        <div className="relative mx-auto max-w-[1200px] px-4 py-16 sm:py-20 lg:py-24">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/45">
            <span className="flex h-9 w-9 items-center justify-center border border-white/15 bg-black/30">
              <BellRing size={16} aria-hidden="true" />
            </span>

            Investor Notification Center
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold uppercase leading-[0.93] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Account
            <span className="block text-white/45">
              Activity
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
            Review application submissions, status changes, and
            important account activity from your private investor
            portal.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-8 sm:py-12">
        <div className="grid border border-white/10 sm:grid-cols-3">
          <div className="border-b border-white/10 bg-white/[0.025] p-6 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Total Activity
            </p>

            <p className="mt-4 text-3xl font-semibold text-white">
              {activities.length}
            </p>
          </div>

          <div className="border-b border-white/10 bg-white/[0.025] p-6 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Unread
            </p>

            <p className="mt-4 text-3xl font-semibold text-white">
              {unreadCount}
            </p>
          </div>

          <div className="bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Latest Update
            </p>

            <p className="mt-4 text-sm leading-6 text-white/70">
              {latestActivity
                ? formatDate(latestActivity)
                : 'No activity yet'}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
              Notification History
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Recent Activity
            </h2>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="btn btn-ghost min-h-12 gap-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {markingAll ? (
              <Loader2
                size={16}
                aria-hidden="true"
                className="animate-spin"
              />
            ) : (
              <CheckCheck size={16} aria-hidden="true" />
            )}

            Mark all as read
          </button>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-sm text-red-200"
          >
            {errorMessage}
          </div>
        ) : null}

        {activities.length ? (
          <div className="mt-6 space-y-4">
            {activities.map((activity) => {
              const unread = !activity.readAt
              const opportunityTitle =
                activity.application?.opportunity?.title ??
                'Investment Application'

              const category =
                activity.application?.opportunity?.category ??
                'Investment'

              const status =
                activity.application?.status ?? 'submitted'

              const opening = openingId === activity.id

              return (
                <article
                  key={activity.id}
                  className={[
                    'relative overflow-hidden border p-5 transition-colors sm:p-6',
                    unread
                      ? 'border-white/20 bg-white/[0.055]'
                      : 'border-white/10 bg-white/[0.02]'
                  ].join(' ')}
                >
                  {unread ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-1 bg-white"
                    />
                  ) : null}

                  <div className="grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <div
                      className={[
                        'flex h-11 w-11 items-center justify-center border',
                        unread
                          ? 'border-white/20 bg-white/10 text-white'
                          : 'border-white/10 bg-black/30 text-white/35'
                      ].join(' ')}
                    >
                      {unread ? (
                        <BellRing size={18} aria-hidden="true" />
                      ) : (
                        <Bell size={18} aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] uppercase tracking-[0.17em] text-white/35">
                          {category}
                        </span>

                        <span
                          className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClasses(
                            status
                          )}`}
                        >
                          {formatStatus(status)}
                        </span>

                        {unread ? (
                          <span className="border border-white/15 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                            New
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-lg font-medium text-white">
                        {opportunityTitle}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-white/50">
                        {activity.message}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/30">
                        <span>
                          {formatStatus(activity.eventType)}
                        </span>

                        <time>
                          {formatDate(activity.createdAt)}
                        </time>

                        {activity.application?.referenceCode ? (
                          <span className="font-mono">
                            {
                              activity.application
                                .referenceCode
                            }
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenActivity(activity)
                      }
                      disabled={opening}
                      className="flex min-h-12 items-center justify-center gap-3 border border-white/10 bg-white/[0.03] px-5 text-sm text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:cursor-wait disabled:opacity-50"
                    >
                      {opening ? (
                        <Loader2
                          size={16}
                          aria-hidden="true"
                          className="animate-spin"
                        />
                      ) : (
                        <ArrowUpRight
                          size={16}
                          aria-hidden="true"
                        />
                      )}

                      View application
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-white/15 px-6 py-16 text-center">
            <FileText
              size={29}
              aria-hidden="true"
              className="mx-auto text-white/25"
            />

            <h3 className="mt-5 text-xl font-medium text-white">
              No account activity
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/40">
              Application submissions and future review updates will
              appear here.
            </p>

            <Link
              href="/opportunities"
              className="btn btn-primary mt-7"
            >
              Explore Opportunities
            </Link>
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 text-xs text-white/30">
          <Clock3 size={14} aria-hidden="true" />
          Activity records are displayed from newest to oldest.
        </div>
      </section>
    </div>
  )
}
