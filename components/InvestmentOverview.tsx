'use client'

import React from 'react'
import Image from 'next/image'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

const STATS = [
  { label: 'Active Opportunities', value: '12' },
  { label: 'Minimum Investment', value: '$5,000' },
  { label: 'Illustrative Target Range', value: '14%–22%' }
]

export default function InvestmentOverview() {
  const reduced = useReducedMotion()

  return (
    <section
      id="overview"
      className="relative w-full overflow-hidden border-t border-white/10 bg-gradient-to-b from-black via-[#070707] to-black py-24 text-white md:py-32"
    >
      <Image
        src="/media/section-backgrounds/overview-earth.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center opacity-[0.22]"
        aria-hidden="true"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black"
      />


      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[18%] -right-[22%] z-[1] h-[68%] w-[92%] select-none sm:-bottom-[26%] sm:-right-[8%] sm:h-[96%] sm:w-[58%] lg:-right-[2%]"
      >
        <Image
          src="/media/section-objects/overview-moon.png"
          alt=""
          fill
          sizes="(max-width: 640px) 92vw, 58vw"
          className="object-contain object-bottom opacity-[0.7] drop-shadow-[0_0_45px_rgba(255,255,255,0.08)] sm:opacity-[0.86]"
        />
      </div>

      <Container className="relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              The Investment Case
            </p>

            <h2 className="mt-4 text-3xl font-semibold uppercase leading-tight tracking-tight md:text-5xl">
              Investment Overview
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
              Concise metrics for mission-focused investors, with clear entry
              points and disciplined selection.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  delay: reduced ? 0 : index * 0.06,
                  duration: reduced ? 0 : 0.5
                }}
                className="border border-white/10 bg-white/5 px-6 py-8 backdrop-blur-md"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                  {stat.label}
                </div>

                <div className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-5 text-xs text-white/35">
            Illustrative prototype figures only. Not an offer, guarantee, or
            investment forecast.
          </p>
        </div>
      </Container>
    </section>
  )
}
