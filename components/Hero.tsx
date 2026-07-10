'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from './ui/Button'
import Container from './ui/Container'

export default function Hero() {
  const reduced = useReducedMotion()
  const enter = reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
  const initial = reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }

  return (
    <section id="hero" className="relative min-h-[72vh] md:h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background poster (fallback) */}
      <img src="/media/hero-poster.svg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-28" />

      {/* Layered cinematic overlays */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(122,162,255,0.03) 0%, transparent 35%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.88) 100%)' }} />

      <Container className="relative z-10 text-center px-6">
        <motion.h1 initial={initial} animate={enter} transition={{ duration: 0.6 }} className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.6rem] leading-tight font-extrabold max-w-3xl mx-auto">
          Invest in tomorrow's
          <br className="hidden sm:block" />
          <span className="block">missions.</span>
        </motion.h1>

        <motion.p initial={initial} animate={enter} transition={{ delay: 0.08, duration: 0.6 }} className="lead mt-6 max-w-2xl mx-auto">
          SpaceX Invest is a mission-aligned investment platform — curated private and public opportunities for long-term, professional investors.
        </motion.p>

        <motion.div initial={initial} animate={enter} transition={{ delay: 0.16, duration: 0.6 }} className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="primary" as="a" className="min-w-[160px]" href="#opportunities">Start Investing</Button>
          <Button variant="ghost" as="a" className="min-w-[140px]" href="#why">Learn More</Button>
        </motion.div>
      </Container>

      {/* Scroll hint */}
      <div className="absolute bottom-6 w-full flex justify-center z-10">
        <div className="w-9 h-12 rounded-full border border-[rgba(255,255,255,0.06)] flex items-start justify-center p-1">
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="block w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      </div>
    </section>
  )
}
