'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

export default function InvestmentOverview() {
  const reduced = useReducedMotion()

  const stats = [
    { label: 'Active Opportunities', value: '12' },
    { label: 'Min. Investment', value: '$5,000' },
    { label: 'Target IRR', value: '14%–22%' }
  ]

  return (
    <section id="overview" className="w-full bg-black text-white py-20">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Investment Overview</h2>
          <p className="mt-4 text-sm md:text-base text-white/80">Concise metrics and alignment — mission-driven opportunities selected for long-term investors.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          {stats.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.45 }}>
              <div className="text-sm text-white/60 uppercase tracking-wider">{s.label}</div>
              <div className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">{s.value}</div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
