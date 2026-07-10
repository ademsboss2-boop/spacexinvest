'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

export default function WhySpaceXInvest() {
  const reduced = useReducedMotion()
  const items = [
    { title: 'Mission Focus', text: 'Investments centered on companies advancing space and infrastructure.' },
    { title: 'Technical Rigor', text: 'Engineering-first diligence to assess long-term viability.' },
    { title: 'Operational Access', text: 'Partnerships and access to industry operators.' }
  ]

  return (
    <section id="why" className="w-full bg-black text-white py-24">
      <Container>
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-medium tracking-tight">Why SpaceX Invest</h2>
          <p className="mt-3 text-sm text-white/70">A disciplined approach: mission alignment, engineering rigor, and operational connectivity.</p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {items.map((it, i) => (
              <motion.div key={it.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.06, duration: 0.42 }} className="text-center">
                <div className="text-lg font-semibold">{it.title}</div>
                <div className="mt-2 text-sm text-white/70">{it.text}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
