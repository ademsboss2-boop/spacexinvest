'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

export default function InvestmentOverview() {
  const reduced = useReducedMotion()

  const stats = [
    { label: 'Active Opportunities', value: '12' },
    { label: 'Minimum Investment', value: '$5,000' },
    { label: 'Target IRR', value: '14%–22%' }
  ]

  return (
    <section id="overview" className="w-full bg-black text-white py-24">
      <Container>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-medium tracking-tight">Investment Overview</h2>
          <p className="mt-3 text-sm md:text-base text-white/70">Concise metrics for mission-focused investors. Clear entry points and disciplined selection.</p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.06, duration: 0.45 }} className="text-center">
                <div className="text-sm text-white/60 uppercase tracking-wider">{s.label}</div>
                <div className="mt-3 text-3xl md:text-4xl font-semibold">{s.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
