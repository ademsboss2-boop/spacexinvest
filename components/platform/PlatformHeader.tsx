'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function PlatformHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/6 bg-black/60 backdrop-blur-sm">
      <div className="nav-inner flex items-center justify-between">
        <Link href="/">
          <a className="flex items-center">
            <Image
              src="/media/spacex-logo-transparent.png"
              alt="SpaceX"
              width={200}
              height={28}
              priority
              className="h-8 w-auto"
            />
          </a>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/">
            <a className={`text-sm ${pathname === '/' ? 'text-white' : 'text-white/70'}`}>Home</a>
          </Link>
          <Link href="/opportunities">
            <a className={`text-sm ${pathname?.startsWith('/opportunities') ? 'text-white' : 'text-white/70'}`}>Opportunities</a>
          </Link>
          <Link href="/dashboard">
            <a className={`text-sm ${pathname === '/dashboard' ? 'text-white' : 'text-white/70'}`}>Dashboard</a>
          </Link>
          <span className="ml-3 px-2 py-1 text-xs uppercase tracking-widest text-white/60 bg-white/5 rounded-sm">Demo Mode</span>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"><a className="text-sm text-white/70 hover:text-white">Log in</a></Link>
          <Link href="/signup"><a className="ml-2 px-3 py-2 bg-white text-black rounded-sm text-sm font-semibold">Sign up</a></Link>
        </div>

        <div className="md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2">
            <Menu color="white" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-6 md:hidden">
          <div className="flex items-center justify-between">
            <Image src="/media/spacex-logo-transparent.png" alt="SpaceX" width={160} height={26} />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2">
              <X color="white" />
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-6 items-start">
            <Link href="/"><a className="text-xl">Home</a></Link>
            <Link href="/opportunities"><a className="text-xl">Opportunities</a></Link>
            <Link href="/dashboard"><a className="text-xl">Dashboard</a></Link>
            <div className="mt-6 flex flex-col gap-3 w-full">
              <Link href="/login"><a className="w-full text-center py-2 border border-white/10">Log in</a></Link>
              <Link href="/signup"><a className="w-full text-center py-2 bg-white text-black font-semibold">Sign up</a></Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
