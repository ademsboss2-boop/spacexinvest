'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Button from './ui/Button'
import Container from './ui/Container'

export default function Hero() {
  return (
    <section id="hero" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src="/media/hero-poster.svg" alt="Hero background placeholder" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.25 }} />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 z-0" />

      <Container className="relative z-10 text-center px-6">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl sm:text-6xl font-extrabold leading-tight max-w-4xl mx-auto">
          Invest in tomorrow's missions.
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.6 }} className="mt-6 text-muted max-w-2xl mx-auto">
          SpaceX Invest is a premium, mission-aligned investment experience — curated private and public opportunities for mission-driven investors.
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Button variant="primary" as="a" className="min-w-[160px]" href="#opportunities">Start Investing</Button>
          <Button variant="ghost" as="a" className="min-w-[140px]" href="#why">Learn More</Button>
        </motion.div>
      </Container>

      <div className="absolute bottom-8 w-full flex justify-center z-10">
        <div className="w-9 h-14 rounded-full border border-[rgba(255,255,255,0.08)] flex items-start justify-center p-1">
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="block w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      </div>
    </section>
  )
}
