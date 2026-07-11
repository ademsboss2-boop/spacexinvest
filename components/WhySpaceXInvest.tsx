'use client'

import React from 'react'
import Image from 'next/image'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

const ITEMS = [
  {
    title: 'Mission Focus',
    text: 'Investments centered on technologies advancing space and global infrastructure.'
  },
  {
    title: 'Technical Rigor',
    text: 'Engineering-first diligence designed to assess long-term viability.'
  },
  {
    title: 'Operational Access',
    text: 'A prototype experience built around industry insight and connectivity.'
  }
]

export default function WhySpaceXInvest() {
  const reduced = useReducedMotion()

  return (
    <section
      id="why"
      className="relative w-full border-t border-white/10 bg-gradient-to-b from-[#050505] via-[#090909] to-black py-24 text-white md:py-32"
    >
      <Image
        src="/media/section-backgrounds/why-astronaut.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-right opacity-[0.18]"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/65"
        aria-hidden="true"
      />


      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[28%] top-[8%] z-[1] h-[70%] w-[96%] select-none sm:-right-[14%] sm:top-[6%] sm:h-[86%] sm:w-[64%] lg:-right-[8%]"
      >
        <Image
          src="/media/section-objects/why-starlink.png"
          alt=""
          fill
          sizes="(max-width: 640px) 96vw, 64vw"
          className="object-contain object-right opacity-[0.28] drop-shadow-[0_15px_45px_rgba(0,0,0,0.7)] sm:opacity-[0.48]"
        />
      </div>

      <Container className="relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                Our Approach
              </p>

              <h2 className="mt-4 text-3xl font-semibold uppercase leading-tight tracking-tight md:text-5xl">
                Why SpaceX Invest
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
                A disciplined approach built around mission alignment,
                engineering rigor, and operational awareness.
              </p>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
              {ITEMS.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={reduced ? false : { opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{
                    delay: reduced ? 0 : index * 0.06,
                    duration: reduced ? 0 : 0.5
                  }}
                  className="grid gap-4 py-8 sm:grid-cols-[70px_1fr]"
                >
                  <div className="text-xs font-semibold tracking-[0.2em] text-white/30">
                    0{index + 1}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
                      {item.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
