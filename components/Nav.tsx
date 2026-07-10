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

  // Prevent background scroll and mark main content hidden for screen readers
  useEffect(() => {
    const page = document.getElementById('page-content')
    if (open) {
      document.body.style.overflow = 'hidden'
      if (page) page.setAttribute('aria-hidden', 'true')
    } else {
      document.body.style.overflow = ''
      if (page) page.removeAttribute('aria-hidden')
    }
    return () => {
      document.body.style.overflow = ''
      if (page) page?.removeAttribute('aria-hidden')
    }
  }, [open])

  // Keyboard trap & Escape handling
  useEffect(() => {
    if (!open || !menuRef.current) return

    const focusable = menuRef.current.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
    if (focusable.length) focusable[0].focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'Tab') {
        const nodes = Array.from(focusable)
        const idx = nodes.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && idx === 0) {
          e.preventDefault()
          nodes[nodes.length - 1].focus()
        } else if (!e.shiftKey && idx === nodes.length - 1) {
          e.preventDefault()
          nodes[0].focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Smooth scroll for in-page links (improves UX on anchor clicks)
  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string) {
    const id = href.replace('#', '')
    const target = document.getElementById(id)
    if (target) {
      e.preventDefault()
      setOpen(false)
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <header className="w-full top-0 left-0 z-50 sticky nav-glass">
      <div className="nav-inner">
        <div className="flex items-center gap-6">
          <a href="#" className="logo" aria-label="SpaceX Invest">
            <span style={{ letterSpacing: '-0.02em' }}>SpaceX</span> <span style={{ opacity: 0.9 }}>Invest</span>
          </a>
        </div>

        <nav className="hidden md:flex items-center nav-links" aria-label="Primary navigation">
          {navItems.map((n) => (
            <a key={n.label} href={n.href} onClick={(e) => handleNavClick(e, n.href)} className="text-sm small-muted">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" as="button">Log in</Button>
          <Button variant="primary" as="button">Start Investing</Button>
        </div>

        <div className="md:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="p-2">
            <Menu color="white" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          >
            <div ref={menuRef} className="flex items-center justify-between p-6">
              <a className="logo" href="#">SpaceX Invest</a>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2">
                <X color="white" />
              </button>
            </div>

            <motion.nav
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.36, ease: [0.2, 0.9, 0.2, 1] }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
              aria-label="Mobile navigation"
            >
              {navItems.map((n) => (
                <a
                  key={n.label}
                  href={n.href}
                  onClick={(e) => handleNavClick(e, n.href)}
                  className="text-2xl font-medium"
                >
                  {n.label}
                </a>
              ))}

              <div className="mt-6 flex flex-col gap-4 w-3/4">
                <Button variant="ghost" as="button" className="w-full">Log in</Button>
                <Button variant="primary" as="button" className="w-full">Start Investing</Button>
              </div>
            </motion.nav>

            <div className="p-6 text-center small-muted">© {new Date().getFullYear()} SpaceX Invest</div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
