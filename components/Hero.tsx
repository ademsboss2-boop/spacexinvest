'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from './ui/Button'
import Container from './ui/Container'

export default function Hero() {
  const reduce = useReducedMotion()
  const initial = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
  const animate = { opacity: 1, y: 0 }

  return (
    <section id="hero" className="relative w-full min-h-[80vh] md:min-h-screen flex items-center justify-center bg-black overflow-hidden">
      {/* Full-bleed background media (poster) */}
      <img src="/media/hero-poster.svg" alt="" className="absolute inset-0 w-full h-full object-cover brightness-[0.28]" />

      {/* Subtle deep vignette to ensure copy legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black" />

      <Container className="relative z-10 text-center px-6 py-16">
        <motion.h1 initial={initial} animate={animate} transition={{ duration: 0.6 }} className="text-white font-extrabold leading-tight text-3xl sm:text-4xl md:text-5xl lg:text-[4rem] max-w-3xl mx-auto">
          Invest in tomorrow's
          <span className="block">missions.</span>
        </motion.h1>

        <motion.p initial={initial} animate={animate} transition={{ delay: 0.08, duration: 0.6 }} className="mt-6 text-sm sm:text-base text-white/80 max-w-2xl mx-auto">
          Curated opportunities aligned to mission-driven companies and technologies.
        </motion.p>

        <motion.div initial={initial} animate={animate} transition={{ delay: 0.16, duration: 0.6 }} className="mt-8 flex items-center justify-center gap-3">
          <Button as="a" href="#opportunities" variant="primary" className="min-w-[160px]">Explore Opportunities</Button>
          <Button as="a" href="#overview" variant="ghost" className="min-w-[140px]">Overview</Button>
        </motion.div>
      </Container>

      {/* Decorative, very subtle scroll indicator */}
      <div className="absolute bottom-8 w-full flex justify-center z-10">
        <div className="w-8 h-12 rounded-full border border-white/10 flex items-start justify-center p-1">
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="block w-1.5 h-1.5 bg-white rounded-full opacity-70" />
        </div>
      </div>
    </section>
  )
}
