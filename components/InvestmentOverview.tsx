'use client'

import React from 'react'
import Container from './ui/Container'
import { motion } from 'framer-motion'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-muted text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}

export default function InvestmentOverview() {
  return (
    <section id="overview" className="py-20">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold">Investment Overview</h2>
          <p className="mt-3 text-muted">
            A concise snapshot of the fund types, expected horizons, and mission alignment. This is a landing page overview — dashboards and full data will be added in Phase 2.
          </p>
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard label="Active Opportunities" value="12" />
          <StatCard label="Min. Investment" value="$5,000" />
          <StatCard label="Target IRR" value="14%–22%" />
        </motion.div>
      </Container>
    </section>
  )
}
