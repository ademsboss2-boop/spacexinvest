'use client'

import React, { useState } from 'react'
import Container from './ui/Container'
import { motion } from 'framer-motion'

const FAQ_ITEMS = [
  { q: 'Who can invest?', a: 'This prototype assumes accredited and institutional investors for private offerings. Public funds have lower thresholds.' },
  { q: 'What is the minimum investment?', a: 'Minimums vary by offering. Many curated private opportunities begin at $5,000–$25,000 for early access.' },
  { q: 'How is reporting handled?', a: 'Quarterly reporting and ad-hoc investor updates. Full reporting is part of the dashboard feature planned for Phase 2.' }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 bg-[linear-gradient(180deg,transparent,#080808)]">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <p className="mt-3 text-muted">Common questions about investing through SpaceX Invest.</p>
        </div>

        <div className="mt-8 max-w-3xl mx-auto">
          {FAQ_ITEMS.map((f, i) => {
            const open = openIndex === i
            return (
              <div key={f.q} className="border-b border-[rgba(255,255,255,0.04)] py-4">
                <button className="w-full text-left flex items-center justify-between gap-4 focus-visible:underline" onClick={() => setOpenIndex(open ? null : i)}>
                  <div>
                    <div className="font-medium">{f.q}</div>
                  </div>
                  <div className="text-muted">{open ? '−' : '+'}</div>
                </button>

                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.28 }}>
                  {open && <div className="mt-3 text-muted text-sm">{f.a}</div>}
                </motion.div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
