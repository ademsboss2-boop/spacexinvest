'use client'

import React from 'react'
import Container from './ui/Container'
import { MotionConfig, motion } from 'framer-motion'
import { Award, Cpu } from 'lucide-react'

export default function WhySpaceXInvest() {
  return (
    <section id="why" className="py-20 bg-[linear-gradient(180deg,#0b0b0b,transparent)]">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="h-xl">Why SpaceX Invest</h2>
          <p className="lead mt-3">We combine deep domain expertise with engineering rigor and operational experience — building investments that align with mission and scale.</p>
        </div>

        <MotionConfig transition={{ duration: 0.5 }}>
          <motion.div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div className="card">
              <div className="flex items-center gap-3">
                <Award size={20} />
                <h3 className="font-semibold">Mission Alignment</h3>
              </div>
              <p className="text-muted mt-2 text-sm">Investments are selected for strategic fit and long-term mission impact.</p>
            </motion.div>

            <motion.div className="card">
              <div className="flex items-center gap-3">
                <Cpu size={20} />
                <h3 className="font-semibold">Engineering Rigor</h3>
              </div>
              <p className="text-muted mt-2 text-sm">Technical and financial diligence modeled after product development processes.</p>
            </motion.div>

            <motion.div className="card">
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12h20" stroke="currentColor" strokeWidth="1.2"/></svg>
                <h3 className="font-semibold">Operational Experience</h3>
              </div>
              <p className="text-muted mt-2 text-sm">Access to operators, advisors, and key industry partnerships.</p>
            </motion.div>
          </motion.div>
        </MotionConfig>
      </Container>
    </section>
  )
}
