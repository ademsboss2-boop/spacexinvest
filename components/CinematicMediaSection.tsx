'use client'

import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import Button from './ui/Button'
import Container from './ui/Container'

type CinematicMediaSectionProps = {
  sectionId?: string
  id?: string
  videoSrc?: string
  imageSrc?: string
  imageAlt?: string
  poster?: string
  eyebrow?: string
  title: string
  description?: string
  buttonLabel?: string
  buttonHref?: string
  align?: 'left' | 'center' | 'right'
}

export default function CinematicMediaSection({
  sectionId,
  id,
  videoSrc,
  imageSrc,
  imageAlt,
  poster,
  eyebrow,
  title,
  description,
  buttonLabel,
  buttonHref = '#opportunities',
  align = 'left'
}: CinematicMediaSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current

    if (!video || !section || !videoSrc) return

    if (reduceMotion) {
      video.pause()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const playPromise = video.play()

          if (playPromise) {
            playPromise.catch(() => {
              // Autoplay may be restricted by the browser.
            })
          }
        } else {
          video.pause()
        }
      },
      {
        threshold: [0, 0.5, 1]
      }
    )

    observer.observe(section)

    return () => {
      observer.disconnect()
      video.pause()
    }
  }, [videoSrc, reduceMotion])

  const alignmentClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center mx-auto',
    right: 'items-end text-right ml-auto'
  }

  const motionProps = {
    initial: reduceMotion
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: {
      duration: reduceMotion ? 0 : 0.72
    }
  }

  return (
    <section
      id={sectionId ?? id}
      ref={sectionRef}
      className="relative min-h-[90svh] w-full overflow-hidden bg-black md:min-h-[100svh]"
    >
      {videoSrc ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay={!reduceMotion}
          aria-hidden="true"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt ?? title}
          fill
          sizes="100vw"
          className="object-cover"
        />
      ) : null}

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/75"
        aria-hidden="true"
      />

      <Container className="relative z-10 flex min-h-[90svh] items-end px-6 pb-14 pt-28 md:min-h-[100svh] md:pb-20">
        <div
          className={`flex w-full max-w-3xl flex-col ${alignmentClasses[align]}`}
        >
          {eyebrow ? (
            <motion.p
              {...motionProps}
              className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75"
            >
              {eyebrow}
            </motion.p>
          ) : null}

          <motion.h2
            {...motionProps}
            className="mt-3 text-3xl font-extrabold uppercase leading-[0.98] text-white sm:text-4xl md:text-5xl lg:text-[3.7rem]"
          >
            {title}
          </motion.h2>

          {description ? (
            <motion.p
              {...motionProps}
              className="mt-5 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base"
            >
              {description}
            </motion.p>
          ) : null}

          {buttonLabel ? (
            <motion.div {...motionProps} className="mt-7">
              <Button
                as="a"
                href={buttonHref}
                variant="primary"
                className="min-w-[190px]"
              >
                {buttonLabel}
              </Button>
            </motion.div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
