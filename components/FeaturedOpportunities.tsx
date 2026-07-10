'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

type Opportunity = { id: string; title: string; subtitle: string; minInvestment: string; tag: string }

const SAMPLE: Opportunity[] = [
  { id: '1', title: 'Starlink Growth Series', subtitle: 'Series A–B secondary access', minInvestment: '$25,000', tag: 'Private' },
  { id: '2', title: 'Launch Services Co-Invest', subtitle: 'Growth capital for dedicated launch capacity', minInvestment: '$10,000', tag: 'Private' },
  { id: '3', title: 'Public Equity Fund', subtitle: 'Mission-aligned public equities', minInvestment: '$5,000', tag: 'Public' }
]

export default function FeaturedOpportunities() {
  const reduced = useReducedMotion()

  return (
    <section id="opportunities" className="w-full bg-white text-black py-20">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Featured Opportunities</h2>
          <p className="mt-3 text-sm text-black/60">Selected mission-aligned offerings with clear entry points.</p>
        </div>

        <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 gap-6">
          {SAMPLE.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.06, duration: 0.42 }} className="w-full border-b border-black/8 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm text-black/50 uppercase tracking-wide">{s.tag}</div>
                  <div className="mt-2 text-xl font-semibold">{s.title}</div>
                  <div className="mt-1 text-sm text-black/60">{s.subtitle}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-black/50">Min</div>
                  <div className="text-lg font-semibold">{s.minInvestment}</div>
                  <a href="#" className="ml-4 text-sm text-black/60">Learn more</a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
