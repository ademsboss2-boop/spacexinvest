'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

type Opportunity = {
  id: string
  title: string
  subtitle: string
  minInvestment: string
  tag: string
}

const SAMPLE: Opportunity[] = [
  { id: '1', title: 'Starlink Growth Series', subtitle: 'Series A–B secondary access', minInvestment: '$25,000', tag: 'Private' },
  { id: '2', title: 'Launch Services Co-Invest', subtitle: 'Growth capital for dedicated launch capacity', minInvestment: '$10,000', tag: 'Private' },
  { id: '3', title: 'Public Equity Fund', subtitle: 'Mission-aligned public equities', minInvestment: '$5,000', tag: 'Public' }
]

function Card({ o }: { o: Opportunity }) {
  const reduced = useReducedMotion()
  return (
    <motion.article className="card" whileHover={reduced ? {} : { y: -6, boxShadow: '0 22px 40px rgba(0,0,0,0.72)' }} transition={{ duration: 0.25 }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted uppercase tracking-[0.06em]">{o.tag}</div>
          <h3 className="mt-2 font-semibold text-lg">{o.title}</h3>
          <p className="text-muted mt-2 text-sm">{o.subtitle}</p>
        </div>

        <div className="text-right">
          <div className="text-sm text-muted">Min</div>
          <div className="mt-1 font-semibold">{o.minInvestment}</div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button className="btn btn-ghost btn-sm">Learn More</button>
        <button className="btn btn-primary btn-sm">Invest</button>
      </div>
    </motion.article>
  )
}

export default function FeaturedOpportunities() {
  return (
    <section id="opportunities" className="py-20">
      <Container>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="h-xl">Featured Opportunities</h2>
            <p className="lead mt-2">Curated, mission-aligned investments — selected for strategic fit and strong long-term potential.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <a className="text-sm small-muted" href="#opportunities">View all</a>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE.map((s) => (
            <Card key={s.id} o={s} />
          ))}
        </div>
      </Container>
    </section>
  )
}
