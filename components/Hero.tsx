'use client'

import React, { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from './ui/Button'
import Container from './ui/Container'

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const video = videoRef.current

    if (!video) return

    if (reduceMotion) {
      video.pause()
      return
    }

    const playPromise = video.play()

    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay may be restricted by the browser.
      })
    }
  }, [reduceMotion])

  const initial = reduceMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 12 }

  const animate = { opacity: 1, y: 0 }

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] w-full items-end overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster="/media/hero-poster.svg"
        muted
        loop
        playsInline
        preload="metadata"
        autoPlay={!reduceMotion}
        aria-hidden="true"
      >
        <source src="/media/hero.mp4" type="video/mp4" />
      </video>

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/80"
        aria-hidden="true"
      />

      <Container className="relative z-10 w-full px-6 pb-16 pt-32 sm:pb-20 md:pb-28">
        <div className="max-w-3xl">
          <motion.h1
            initial={initial}
            animate={animate}
            transition={{ duration: reduceMotion ? 0 : 0.7 }}
            className="text-4xl font-extrabold uppercase leading-[0.95] text-white sm:text-5xl md:text-6xl lg:text-[4.6rem]"
          >
            Invest in the next era
            <span className="block">of space missions.</span>
          </motion.h1>

          <motion.p
            initial={initial}
            animate={animate}
            transition={{
              delay: reduceMotion ? 0 : 0.08,
              duration: reduceMotion ? 0 : 0.7
            }}
            className="mt-6 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base"
          >
            Curated, mission-aligned investment opportunities — disciplined,
            long-term, and engineered for impact.
          </motion.p>

          <motion.div
            initial={initial}
            animate={animate}
            transition={{
              delay: reduceMotion ? 0 : 0.16,
              duration: reduceMotion ? 0 : 0.7
            }}
            className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <Button
              as="a"
              href="#opportunities"
              variant="primary"
              className="min-w-[200px]"
            >
              Explore Opportunities
            </Button>

            <Button
              as="a"
              href="#overview"
              variant="ghost"
              className="min-w-[150px]"
            >
              Overview
            </Button>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}
