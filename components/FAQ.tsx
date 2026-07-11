'use client'

import React, { useState } from 'react'
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
      <Container>
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
