import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PrototypeNotice from '../../../components/platform/PrototypeNotice'
import {
  getOpportunityBySlug,
  listOpportunitySlugs
} from '../../../lib/opportunities'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return listOpportunitySlugs().map((slug) => ({ slug }))
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { slug } = await params
  const opportunity = getOpportunityBySlug(slug)

  if (!opportunity) notFound()

  const transparentObject = opportunity.media.endsWith('.png')

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <section className="relative flex min-h-[72svh] items-end overflow-hidden border-b border-white/10">
        <Image
          src={opportunity.media}
          alt={`${opportunity.title} opportunity visual`}
          fill
          priority
          sizes="100vw"
          className={
            transparentObject
              ? 'object-contain object-right p-8 opacity-80 md:p-16'
              : 'object-cover opacity-55'
          }
        />

        <div
          className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-16 pt-32 md:pb-24">
          <Link
            href="/opportunities"
            className="text-sm text-white/50 transition-colors hover:text-white"
          >
            ← Back to Opportunities
          </Link>

          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
            {opportunity.category} · {opportunity.status}
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-semibold uppercase leading-[0.96] tracking-tight md:text-7xl">
            {opportunity.title}
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            {opportunity.summary}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/invest/${opportunity.slug}`}
              className="btn btn-primary"
            >
              Start Demo Investment
            </Link>

            <div className="text-sm text-white/50">
              Demo minimum: {opportunity.formattedMinimum}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <PrototypeNotice>
            {opportunity.prototypeDisclaimer}
          </PrototypeNotice>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Overview
                </p>

                <p className="mt-4 text-sm leading-7 text-white/65 md:text-base">
                  {opportunity.overview}
                </p>
              </section>

              <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Investment Thesis
                </p>

                <p className="mt-4 text-sm leading-7 text-white/65 md:text-base">
                  {opportunity.investmentThesis}
                </p>
              </section>

              <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Illustrative Highlights
                </p>

                <ul className="mt-5 space-y-4">
                  {opportunity.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex gap-4 text-sm leading-relaxed text-white/60"
                    >
                      <span aria-hidden="true" className="text-white/35">
                        —
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="space-y-6">
              <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Prototype Metrics
                </p>

                <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
                  {opportunity.metrics.map((metric) => (
                    <div key={metric.label} className="py-5">
                      <div className="text-xs uppercase tracking-[0.15em] text-white/35">
                        {metric.label}
                      </div>

                      <div className="mt-2 text-xl font-semibold text-white">
                        {metric.value}
                      </div>

                      {metric.note ? (
                        <div className="mt-1 text-xs text-white/35">
                          {metric.note}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Disclosed Risks
                </p>

                <ul className="mt-5 space-y-4">
                  {opportunity.risks.map((risk) => (
                    <li
                      key={risk}
                      className="flex gap-4 text-sm leading-relaxed text-white/60"
                    >
                      <span aria-hidden="true" className="text-white/35">
                        —
                      </span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <Link
                href={`/invest/${opportunity.slug}`}
                className="btn btn-primary w-full"
              >
                Start Demo Investment
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
