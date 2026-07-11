'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'
import { OPPORTUNITIES } from '../lib/opportunities'

export default function FeaturedOpportunities() {
  const reduced = useReducedMotion()

  return (
    <section
      id="opportunities"
      className="relative w-full border-t border-white/10 bg-[#050505] py-24 text-white md:py-32"
    >
      <Image
        src="/media/section-backgrounds/opportunities-falcon.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center opacity-[0.2]"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/85 to-[#050505]"
        aria-hidden="true"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[10%] -right-[30%] z-[1] h-[58%] w-[95%] select-none sm:-right-[12%] sm:-bottom-[6%] sm:h-[88%] sm:w-[56%] lg:-right-[5%]"
      >
        <Image
          src="/media/section-objects/opportunities-falcon9.png"
          alt=""
          fill
          sizes="(max-width: 640px) 95vw, 56vw"
          className="object-contain object-right-bottom opacity-[0.38] drop-shadow-[0_20px_50px_rgba(0,0,0,0.65)] sm:opacity-[0.64]"
        />
      </div>

      <Container className="relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Selected Access
            </p>

            <h2 className="mt-4 text-3xl font-semibold uppercase leading-tight tracking-tight md:text-5xl">
              Featured Opportunities
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
              Selected mission-aligned offerings with clear entry points and
              transparent terms.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {OPPORTUNITIES.map((opportunity, index) => (
              <motion.article
                key={opportunity.slug}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  delay: reduced ? 0 : index * 0.06,
                  duration: reduced ? 0 : 0.5
                }}
                className="group border border-white/10 bg-white/5 px-6 py-7 backdrop-blur-md transition-colors hover:bg-white/10 md:px-8"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                      {opportunity.category}
                    </div>

                    <h3 className="mt-3 text-xl font-semibold tracking-tight md:text-2xl">
                      {opportunity.title}
                    </h3>

                    <p className="mt-2 text-sm text-white/55">
                      {opportunity.subtitle}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-8 sm:justify-end">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                        Minimum
                      </div>

                      <div className="mt-2 text-lg font-semibold">
                        {opportunity.formattedMinimum}
                      </div>
                    </div>

                    <Link
                      href={`/opportunities/${opportunity.slug}`}
                      className="ml-4 border-b border-white/30 pb-1 text-sm text-white/60 transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      Learn more
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
