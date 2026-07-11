'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Container from './ui/Container'
import {
  AnimatePresence,
  motion,
  useReducedMotion
} from 'framer-motion'

const FAQ_ITEMS = [
  {
    q: 'Who can invest?',
    a: 'This competition prototype illustrates accredited, institutional, and public-investment experiences. It does not accept real investments.'
  },
  {
    q: 'What is the minimum investment?',
    a: 'Illustrative minimums vary by opportunity and are shown only to demonstrate the intended platform experience.'
  },
  {
    q: 'How is reporting handled?',
    a: 'The prototype envisions quarterly reporting and investor updates through a future dashboard experience.'
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const reduced = useReducedMotion()

  return (
    <section
      id="faq"
      className="relative w-full border-t border-white/10 bg-gradient-to-b from-black to-[#060606] py-24 text-white md:py-32"
    >
      <Image
        src="/media/section-backgrounds/faq-mars.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center opacity-[0.14]"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-[#060606]"
        aria-hidden="true"
      />


      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[24%] -right-[30%] z-[1] h-[72%] w-[95%] select-none sm:-bottom-[28%] sm:-right-[14%] sm:h-[94%] sm:w-[62%] lg:-right-[8%]"
      >
        <Image
          src="/media/section-objects/faq-planet.png"
          alt=""
          fill
          sizes="(max-width: 640px) 95vw, 62vw"
          className="object-contain object-right-bottom opacity-[0.36] drop-shadow-[0_0_50px_rgba(255,255,255,0.06)] sm:opacity-[0.6]"
        />
      </div>

      <Container className="relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Investor Information
            </p>

            <h2 className="mt-4 text-3xl font-semibold uppercase tracking-tight md:text-5xl">
              Frequently Asked Questions
            </h2>

            <p className="mt-5 text-sm leading-relaxed text-white/60 md:text-base">
              Common questions about the SpaceX Invest competition prototype.
            </p>
          </div>

          <div className="mt-12 space-y-3">
            {FAQ_ITEMS.map((item, index) => {
              const open = openIndex === index
              const answerId = `faq-answer-${index}`

              return (
                <div
                  key={item.q}
                  className="border border-white/10 bg-white/5 px-6 backdrop-blur-md md:px-8"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={answerId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex min-h-[76px] w-full items-center justify-between gap-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <span className="text-base font-medium md:text-lg">
                      {item.q}
                    </span>

                    <span
                      aria-hidden="true"
                      className="text-2xl font-light text-white/45"
                    >
                      {open ? '−' : '+'}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        id={answerId}
                        initial={reduced ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-3xl pb-7 text-sm leading-relaxed text-white/55">
                          {item.a}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
