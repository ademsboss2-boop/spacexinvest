import React from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import PlatformHeader from '../../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../../components/platform/PlatformFooter'
import { createClient } from '../../../../lib/supabase/server'

type PageProps = {
  params: Promise<{
    reference: string
  }>
}

type RawApplication = {
  id: string
  amount: number | string
  status: string
  reference_code: string
  submitted_at: string
  opportunity: {
    slug: string
    title: string
    category: string
    status: string
    minimum_investment: number | string
  } | null
}

type ApplicationActivity = {
  id: string
  event_type: string
  message: string
  created_at: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export default async function ApplicationDetailsPage({
  params
}: PageProps) {
  const { reference } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    const destination = `/dashboard/applications/${encodeURIComponent(
      reference
    )}`

    redirect(`/login?next=${encodeURIComponent(destination)}`)
  }

  const { data: applicationData, error: applicationError } =
    await supabase
      .from('investment_applications')
      .select(`
        id,
        amount,
        status,
        reference_code,
        submitted_at,
        opportunity:opportunities (
          slug,
          title,
          category,
          status,
          minimum_investment
        )
      `)
      .eq('reference_code', reference)
      .eq('user_id', user.id)
      .maybeSingle()

  if (applicationError || !applicationData) {
    notFound()
  }

  const application =
    applicationData as unknown as RawApplication

  const { data: activityData } = await supabase
    .from('application_activity')
    .select(`
      id,
      event_type,
      message,
      created_at
    `)
    .eq('application_id', application.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const storedActivities =
    (activityData ?? []) as ApplicationActivity[]

  const activities: ApplicationActivity[] =
    storedActivities.length > 0
      ? storedActivities
      : [
          {
            id: `submitted-${application.id}`,
            event_type: 'submitted',
            message:
              'Investment application submitted for review.',
            created_at: application.submitted_at
          }
        ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#060606] to-black text-white">
      <PlatformHeader />

      <div className="mx-auto max-w-[1100px] px-4 py-12 md:py-20">
        <Link
          href="/dashboard"
          className="text-sm text-white/45 transition-colors hover:text-white"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Investment Application
            </p>

            <h1 className="mt-3 max-w-3xl text-4xl font-semibold uppercase tracking-tight text-white md:text-6xl">
              {application.opportunity?.title ??
                'Application Details'}
            </h1>

            <p className="mt-4 font-mono text-sm text-white/40">
              {application.reference_code}
            </p>
          </div>

          <span className="w-fit border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70">
            {formatStatus(application.status)}
          </span>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Requested Amount
            </p>

            <p className="mt-4 text-2xl font-semibold text-white">
              {formatCurrency(Number(application.amount))}
            </p>
          </div>

          <div className="border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Current Status
            </p>

            <p className="mt-4 text-lg font-semibold text-white">
              {formatStatus(application.status)}
            </p>
          </div>

          <div className="border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Submitted
            </p>

            <p className="mt-4 text-sm leading-relaxed text-white">
              {formatDate(application.submitted_at)}
            </p>
          </div>

          <div className="border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Activity Events
            </p>

            <p className="mt-4 text-2xl font-semibold text-white">
              {activities.length}
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="border border-white/10 bg-white/5 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">
              Status History
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Application Timeline
            </h2>

            <div className="mt-8">
              {activities.map((activity, index) => (
                <article
                  key={activity.id}
                  className="relative grid grid-cols-[24px_1fr] gap-4"
                >
                  <div className="relative flex justify-center">
                    <span className="relative z-10 mt-1.5 h-3 w-3 border border-white/40 bg-white" />

                    {index < activities.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 top-4 w-px bg-white/15"
                      />
                    ) : null}
                  </div>

                  <div className="pb-9">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <h3 className="font-medium text-white">
                        {formatStatus(activity.event_type)}
                      </h3>

                      <time className="text-xs text-white/35">
                        {formatDate(activity.created_at)}
                      </time>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-white/55">
                      {activity.message}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="border border-white/10 bg-white/5 p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Opportunity
              </p>

              <h2 className="mt-3 text-2xl font-semibold text-white">
                {application.opportunity?.title ??
                  'Investment Opportunity'}
              </h2>

              {application.opportunity ? (
                <>
                  <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
                    <div className="flex justify-between gap-4 py-4">
                      <span className="text-sm text-white/40">
                        Category
                      </span>

                      <span className="text-right text-sm text-white">
                        {application.opportunity.category}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 py-4">
                      <span className="text-sm text-white/40">
                        Opportunity status
                      </span>

                      <span className="text-right text-sm text-white">
                        {application.opportunity.status}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 py-4">
                      <span className="text-sm text-white/40">
                        Minimum investment
                      </span>

                      <span className="text-right text-sm text-white">
                        {formatCurrency(
                          Number(
                            application.opportunity
                              .minimum_investment
                          )
                        )}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/opportunities/${application.opportunity.slug}`}
                    className="btn btn-ghost mt-6 w-full"
                  >
                    View Opportunity
                  </Link>
                </>
              ) : null}
            </section>

            <section className="border border-white/10 bg-white/5 p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Important
              </p>

              <p className="mt-4 text-sm leading-relaxed text-white/55">
                This record represents an investment application. No
                payment was collected or processed through this
                application.
              </p>
            </section>
          </div>
        </div>
      </div>

      <PlatformFooter />
    </main>
  )
}
