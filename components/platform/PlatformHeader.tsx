'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Dashboard', href: '/dashboard' }
]

export default function PlatformHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 text-white backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between px-4">
        <Link
          href="/"
          aria-label="SpaceX Invest home"
          className="flex items-center"
        >
          <Image
            src="/media/spacex-logo-transparent.png"
            alt="SpaceX"
            width={220}
            height={32}
            priority
            className="h-8 w-auto object-contain md:h-9"
          />
        </Link>

        <nav
          aria-label="Platform navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/65 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="btn btn-ghost">
            Log in
          </Link>

          <Link href="/signup" className="btn btn-primary">
            Sign up
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="platform-mobile-menu"
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-11 min-w-11 items-center justify-center border border-white/10 text-white md:hidden"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div
          id="platform-mobile-menu"
          className="border-t border-white/10 bg-black/95 px-4 py-6 md:hidden"
        >
          <nav
            aria-label="Mobile platform navigation"
            className="mx-auto flex max-w-[1200px] flex-col gap-2"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-4 text-lg text-white"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn btn-ghost"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="btn btn-primary"
              >
                Sign up
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
