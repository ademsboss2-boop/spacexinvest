'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Button from './ui/Button'

const navItems = [
  { label: 'Overview', href: '#overview' },
  { label: 'Opportunities', href: '#opportunities' },
  { label: 'Why SpaceX Invest', href: '#why' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const page = document.getElementById('page-content')

    if (open) {
      document.body.style.overflow = 'hidden'
      page?.setAttribute('aria-hidden', 'true')
    } else {
      document.body.style.overflow = ''
      page?.removeAttribute('aria-hidden')
    }

    return () => {
      document.body.style.overflow = ''
      page?.removeAttribute('aria-hidden')
    }
  }, [open])

  useEffect(() => {
    if (!open || !menuRef.current) return

    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    )

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

  function handleNavClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) {
    const id = href.replace('#', '')
    const target = document.getElementById(id)

    if (target) {
      e.preventDefault()
      setOpen(false)
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  const backdropVariant = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  }

  const panelVariant = shouldReduceMotion
    ? {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
      }
    : {
        hidden: {
          opacity: 0,
          y: 24,
        },
        visible: {
          opacity: 1,
          y: 0,
        },
      }

  return (
    <header className="sticky top-0 left-0 z-50 nav-glass">
      <div className="nav-inner">
        {/* Logo */}
        <a href="#" aria-label="SpaceX Invest" className="flex items-center">
          <Image
            src="/media/spacex-logo-transparent.png"
            alt="SpaceX"
            width={220}
            height={32}
            priority
            className="h-8 md:h-10 lg:h-11 w-auto object-contain"
          />
        </a>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center gap-8"
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost">Log in</Button>
          <Button variant="primary">Start Investing</Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden p-2"
          aria-label="Open Menu"
        >
          <Menu color="white" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariant}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          >
            <div
              ref={menuRef}
              className="flex items-center justify-between p-6"
            >
              <Image
                src="/media/spacex-logo-transparent.png"
                alt="SpaceX"
                width={200}
                height={30}
                className="h-8 w-auto"
              />

              <button
                onClick={() => setOpen(false)}
                className="p-2"
                aria-label="Close Menu"
              >
                <X color="white" />
              </button>
            </div>

            <motion.nav
              variants={panelVariant}
              transition={{
                duration: 0.35,
              }}
              className="flex-1 flex flex-col items-center justify-center gap-8"
            >
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="text-2xl font-medium"
                >
                  {item.label}
                </a>
              ))}

              <div className="mt-8 flex flex-col gap-4 w-3/4 max-w-xs">
                <Button variant="ghost" className="w-full">
                  Log in
                </Button>

                <Button variant="primary" className="w-full">
                  Start Investing
                </Button>
              </div>
            </motion.nav>

            <div className="pb-8 text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} SpaceX Invest
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}