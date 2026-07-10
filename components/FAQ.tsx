'use client'

import React, { useState } from 'react'
import Container from './ui/Container'
import { motion, useReducedMotion } from 'framer-motion'

const FAQ_ITEMS = [
  { q: 'Who can invest?', a: 'This prototype assumes accredited and institutional investors for private offerings. Public funds have lower thresholds.' },
  { q: 'What is the minimum investment?', a: 'Minimums vary by offering. Many curated private opportunities begin at $5,000–$25,000 for early access.' },
  { q: 'How is reporting handled?', a: 'Quarterly reporting and ad-hoc investor updates. Full reporting is part of the dashboard feature planned for Phase 2.' }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const reduced = useReducedMotion()

  return (
    <section id="faq" className="w-full bg-black text-white py-20">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">FAQ</h2>
          <p className="mt-3 text-sm text-white/70">Common questions about investing through SpaceX Invest.</p>
        </div>

        <div className="mt-8 max-w-4xl mx-auto space-y-4">
          {FAQ_ITEMS.map((f, i) => {
            const open = openIndex === i
            return (
              <div key={f.q} className="border-b border-white/6 py-4">
                <button className="w-full text-left flex items-center justify-between gap-4" onClick={() => setOpenIndex(open ? null : i)}>
                  <div className="text-base font-medium">{f.q}</div>
                  <div className="text-white/60">{open ? '−' : '+'}</div>
                </button>

                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.28 }}>
                  {open && <div className="mt-3 text-sm text-white/70">{f.a}</div>}
                </motion.div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
