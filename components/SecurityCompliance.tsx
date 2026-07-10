'use client'

import React from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

const ITEMS = [
  { title: 'Enterprise-grade controls', text: 'Role-based access, audit trails, and continuous monitoring.' },
  { title: 'Data protection', text: 'Encryption in transit and at rest, strict key management.' },
  { title: 'Regulatory alignment', text: 'Workflows and processes aligned with investor regulations.' }
]

export default function SecurityCompliance() {
  const reduced = useReducedMotion()

  return (
    <section id="security" className="w-full bg-white text-black py-20">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Security & Compliance</h2>
          <p className="mt-3 text-sm text-black/60">We build with investor protections and operational transparency at the forefront.</p>
        </div>

        <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {ITEMS.map((it, i) => (
            <motion.div key={it.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.06, duration: 0.42 }}>
              <div className="text-lg font-semibold">{it.title}</div>
              <div className="mt-2 text-sm text-black/60">{it.text}</div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
