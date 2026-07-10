'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

export default function WhySpaceXInvest() {
  const reduced = useReducedMotion()
  const items = [
    { title: 'Mission Focus', text: 'Investments centered on companies advancing space and infrastructure.' },
    { title: 'Technical Rigor', text: 'We apply engineering-first diligence to assess long-term viability.' },
    { title: 'Operational Access', text: 'Access to industry operators and strategic partnerships.' }
  ]

  return (
    <section id="why" className="w-full bg-black text-white py-20">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Why SpaceX Invest</h2>
          <p className="mt-3 text-sm text-white/70">A disciplined approach blending mission alignment with operational expertise.</p>
        </div>

        <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {items.map((it, i) => (
            <motion.div key={it.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.06, duration: 0.42 }}>
              <div className="text-lg font-semibold">{it.title}</div>
              <div className="mt-2 text-sm text-white/70">{it.text}</div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
