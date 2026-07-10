'use client'

import React from 'react'
import Container from './ui/Container'
import { motion } from 'framer-motion'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-muted text-sm">{label}</div>
      <motion.div className="mt-2 text-2xl font-semibold" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {value}
      </motion.div>
    </div>
  )
}

export default function InvestmentOverview() {
  return (
    <section id="overview" className="py-20">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="h-xl">Investment Overview</h2>
          <p className="lead mt-3">Curated mission-aligned opportunities built for disciplined, long-term investors — concise metrics below are representative.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard label="Active Opportunities" value="12" />
          <StatCard label="Min. Investment" value="$5,000" />
          <StatCard label="Target IRR" value="14%–22%" />
        </div>
      </Container>
    </section>
  )
}
