'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Button from './ui/Button'
import Container from './ui/Container'

export default function Hero() {
  return (
    <section id="hero" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background poster (fallback) */}
      <img src="/media/hero-poster.svg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />

      {/* Layered cinematic overlays */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(122,162,255,0.03) 0%, transparent 35%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%)' }} />

      <Container className="relative z-10 text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="h-hero font-extrabold tracking-tight max-w-4xl mx-auto"
        >
          Invest in tomorrow's missions.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="lead mt-6 max-w-2xl mx-auto"
        >
          SpaceX Invest is a mission-aligned investment platform — curated private and public opportunities for long-term, professional investors.
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24, duration: 0.6 }} className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Button variant="primary" as="a" className="min-w-[160px]" href="#opportunities">Start Investing</Button>
          <Button variant="ghost" as="a" className="min-w-[140px]" href="#why">Learn More</Button>
        </motion.div>

        {/* Decorative affordance (subtle rocket / trajectory hint) */}
        <div className="absolute right-8 top-12 opacity-10 pointer-events-none" aria-hidden>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="48" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            <path d="M20 95 C40 85, 80 60, 100 45" stroke="rgba(122,162,255,0.05)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </Container>

      {/* Scroll hint */}
      <div className="absolute bottom-8 w-full flex justify-center z-10">
        <div className="w-9 h-14 rounded-full border border-[rgba(255,255,255,0.06)] flex items-start justify-center p-1">
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="block w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      </div>
    </section>
  )
}
