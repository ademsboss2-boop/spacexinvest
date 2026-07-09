'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Container from './ui/Container'
import Button from './ui/Button'

const navItems = [
  { label: 'Overview', href: '#overview' },
  { label: 'Opportunities', href: '#opportunities' },
  { label: 'Why SpaceX Invest', href: '#why' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' }
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const firstFocusableRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Prevent background scroll when menu is open on mobile
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''

    // mark main content as inert/hidden for assistive tech
    const page = document.getElementById('page-content')
    if (page) {
      if (open) page.setAttribute('aria-hidden', 'true')
      else page.removeAttribute('aria-hidden')
    }

    return () => {
      document.body.style.overflow = ''
      if (page) page.removeAttribute('aria-hidden')
    }
  }, [open])

  useEffect(() => {
    if (!open || !menuRef.current) return

    // focus the first focusable element (close button)
    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length) {
      firstFocusableRef.current = focusable[0]
      focusable[0].focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      } else if (e.key === 'Tab') {
        // trap focus
        const focusableEls = Array.from(focusable)
        const idx = focusableEls.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && idx === 0) {
          e.preventDefault()
          focusableEls[focusableEls.length - 1].focus()
        } else if (!e.shiftKey && idx === focusableEls.length - 1) {
          e.preventDefault()
          focusableEls[0].focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="w-full fixed top-0 left-0 z-50 bg-transparent">
      <Container className="flex items-center justify-between py-4">
        <div className="flex items-center gap-8">
          <a href="#" className="logo text-white text-lg" aria-label="SpaceX Invest home">
            SpaceX Invest
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
          {navItems.map((n) => (
            <a key={n.label} href={n.href} className="text-sm text-muted hover:text-white focus-visible:underline">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" as="button">Log in</Button>
          <Button variant="primary" as="button">Start Investing</Button>
        </div>

        <div className="md:hidden">
          <button aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="p-2">
            <Menu color="white" />
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          >
            <div ref={menuRef} className="flex items-center justify-between p-6 container mx-auto">
              <a className="logo text-white text-lg" href="#">SpaceX Invest</a>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2">
                <X color="white" />
              </button>
            </div>

            <motion.nav
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ stiffness: 260 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
              aria-label="Mobile primary"
            >
              {navItems.map((n) => (
                <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="text-2xl font-medium">
                  {n.label}
                </a>
              ))}

              <div className="mt-6 flex flex-col gap-4 w-3/4">
                <Button variant="ghost" as="button" className="w-full">Log in</Button>
                <Button variant="primary" as="button" className="w-full">Start Investing</Button>
              </div>
            </motion.nav>

            <div className="p-6 text-center text-sm text-muted">© {new Date().getFullYear()} SpaceX Invest</div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
