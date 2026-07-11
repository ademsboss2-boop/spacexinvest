'use client'

import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import Button from './ui/Button'
import Container from './ui/Container'

type Props = {
  id?: string
  sectionId?: string
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
  id,
  sectionId,
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
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!videoRef.current || !videoSrc) return
    const video = videoRef.current

    // IntersectionObserver to pause/play video depending on visibility,
    // so background videos don't keep playing offscreen.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!reduce) {
              const p = video.play()
              if (p && typeof p.then === 'function') p.catch(() => {})
            }
          } else {
            try {
              video.pause()
            } catch {
              /* ignore */
            }
          }
        }
      },
      { threshold: [0.5] }
    )

    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      try {
        video.pause()
      } catch {}
    }
  }, [videoSrc, reduce])

  const motionProps = {
    initial: { opacity: 0, y: 8 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.72 }
  } as const

  // content alignment classes
  const alignmentClass =
    align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left'

  const sectionIdToUse = sectionId ?? id

  return (
    <section id={sectionIdToUse} ref={containerRef} className="relative w-full min-h-[90svh] md:min-h-[100svh] overflow-hidden bg-black">
      {/* Video background (decorative) */}
      {videoSrc ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={videoSrc}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay={!reduce}
          aria-hidden="true"
        />
      ) : imageSrc ? (
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={imageSrc}
            alt={imageAlt ?? title}
            fill
            sizes="(max-width: 640px) 100vw, 100vw"
            style={{ objectFit: 'cover' }}
            priority={false}
          />
        </div>
      ) : null}

      {/* restrained dark overlay for legibility (subtle) */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content positioned toward lower-left (or alignment) */}
      <Container className={`relative z-10 flex ${alignmentClass} h-full`}>
        <div className="mt-auto mb-12 max-w-3xl px-4">
          {eyebrow && (
            <motion.div {...motionProps}>
              <div className="text-xs uppercase tracking-widest text-white/70">{eyebrow}</div>
            </motion.div>
          )}

          <motion.h2 {...motionProps} className="mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-[3.6rem] leading-tight font-extrabold text-white uppercase">
            {title}
          </motion.h2>

          {description && (
            <motion.p {...motionProps} className="mt-4 text-sm md:text-base text-white/80 max-w-2xl">
              {description}
            </motion.p>
          )}

          {buttonLabel && (
            <motion.div {...motionProps} className="mt-6">
              <Button as="a" href={buttonHref} variant="primary">
                {buttonLabel}
              </Button>
            </motion.div>
          )}
        </div>
      </Container>
    </section>
  )
}
