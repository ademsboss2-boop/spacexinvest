'use client'

import React from 'react'
import Container from './ui/Container'
import { MotionConfig, motion } from 'framer-motion'

export default function WhySpaceXInvest() {
  return (
    <section id="why" className="py-20 bg-[linear-gradient(180deg,#0b0b0b,transparent)]">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold">Why SpaceX Invest</h2>
          <p className="mt-3 text-muted">
            Built on decades of mission-driven engineering and scaled operational experience. We combine deep domain knowledge with institutional-grade diligence.
          </p>
        </div>

        <MotionConfig transition={{ duration: 0.5 }}>
          <motion.div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div className="bg-surface p-6 rounded-lg border border-[rgba(255,255,255,0.04)]">
              <h3 className="font-semibold">Mission Alignment</h3>
              <p className="text-muted mt-2 text-sm">Investments are selected for strategic fit and long-term mission impact.</p>
            </motion.div>
            <motion.div className="bg-surface p-6 rounded-lg border border-[rgba(255,255,255,0.04)]">
              <h3 className="font-semibold">Engineering Rigor</h3>
              <p className="text-muted mt-2 text-sm">Rigorous technical and financial diligence modeled after product development processes.</p>
            </motion.div>
            <motion.div className="bg-surface p-6 rounded-lg border border-[rgba(255,255,255,0.04)]">
              <h3 className="font-semibold">Operational Experience</h3>
              <p className="text-muted mt-2 text-sm">Access to operators, advisors, and key industry partnerships.</p>
            </motion.div>
          </motion.div>
        </MotionConfig>
      </Container>
    </section>
  )
}
