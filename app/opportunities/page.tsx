import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PlatformHeader from '../../components/platform/PlatformHeader'
import PlatformFooter from '../../components/platform/PlatformFooter'
import { OPPORTUNITIES } from '../../lib/opportunities'

export default function OpportunitiesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <section className="relative overflow-hidden border-b border-white/10 px-4 py-20 md:py-28">
        <Image
          src="/media/section-backgrounds/overview-earth.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-25"
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-[1200px]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
            Selected Access
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-semibold uppercase leading-[0.96] tracking-tight md:text-7xl">
            Explore Opportunities
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
            Review mission-aligned opportunities across private and public
            markets.
          </p>

        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-5 lg:grid-cols-3">
          {OPPORTUNITIES.map((opportunity) => {
            const transparentObject = opportunity.media.endsWith('.png')

            return (
              <article
                key={opportunity.slug}
                className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md"
              >
                <div className="relative h-64 overflow-hidden bg-[#080808]">
                  <Image
                    src={opportunity.media}
                    alt={`${opportunity.title} opportunity`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className={
                      transparentObject
                        ? 'object-contain p-8'
                        : 'object-cover'
                    }
                  />

                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"
                    aria-hidden="true"
                  />
                </div>

                <div className="p-6">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    {opportunity.category}
                  </div>

                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    {opportunity.title}
                  </h2>

                  <p className="mt-3 min-h-[64px] text-sm leading-relaxed text-white/55">
                    {opportunity.summary}
                  </p>

                  <div className="mt-6 flex items-end justify-between gap-5 border-t border-white/10 pt-5">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-white/35">
                        Minimum Investment
                      </div>

                      <div className="mt-2 font-semibold text-white">
                        {opportunity.formattedMinimum}
                      </div>
                    </div>

                    <Link
                      href={`/opportunities/${opportunity.slug}`}
                      className="border-b border-white/30 pb-1 text-sm text-white/65 transition-colors hover:border-white hover:text-white"
                    >
                      View Opportunity
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
      <PlatformFooter />
    </main>
  )
}
