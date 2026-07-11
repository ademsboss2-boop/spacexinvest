'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

const ITEMS = [
  {
    title: 'Enterprise-Grade Controls',
    text: 'Role-based access, audit trails, and continuous monitoring concepts.'
  },
  {
    title: 'Data Protection',
    text: 'Encryption-focused architecture and disciplined key-management principles.'
  },
  {
    title: 'Investor Safeguards',
    text: 'Prototype workflows designed around protection and transparency principles.'
  }
]

export default function SecurityCompliance() {
  const reduced = useReducedMotion()

  return (
    <section
      id="security"
      className="relative w-full border-t border-white/10 bg-black py-24 text-white md:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/[0.04] to-transparent"
      />

      <Container className="relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Built With Discipline
            </p>

            <h2 className="mt-4 text-3xl font-semibold uppercase leading-tight tracking-tight md:text-5xl">
              Security &amp; Compliance
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
              Investor protections, system integrity, and operational
              transparency remain central to the prototype experience.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {ITEMS.map((item, index) => (
              <motion.div
                key={item.title}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  delay: reduced ? 0 : index * 0.06,
                  duration: reduced ? 0 : 0.5
                }}
                className="border border-white/10 bg-white/5 p-7 backdrop-blur-md"
              >
                <div className="text-xs font-semibold tracking-[0.2em] text-white/30">
                  0{index + 1}
                </div>

                <h3 className="mt-8 text-xl font-semibold">{item.title}</h3>

                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
