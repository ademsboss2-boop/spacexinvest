import React from 'react'
import Link from 'next/link'

export default function PlatformFooter() {
  return (
    <footer className="border-t border-white/10 bg-black px-4 py-8 text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 text-center text-xs text-white/35 md:flex-row md:items-center md:justify-between md:text-left">
        <span>
          &copy; {new Date().getFullYear()} SpaceX Invest
        </span>

        <span>
          Private early access. This portal is available only to approved investors.
          Funding instructions and submissions remain subject to finance review and verification.
          Public access is not yet available.
        </span>

        <Link
          href="/"
          className="transition-colors hover:text-white"
        >
          Return Home
        </Link>
      </div>
    </footer>
  )
}
