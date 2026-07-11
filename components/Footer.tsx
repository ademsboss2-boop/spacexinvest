import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#030303] px-6 py-14 text-white">
      <div className="container mx-auto">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div>
              <div className="text-lg font-semibold uppercase tracking-[0.12em]">
                SpaceX Invest
              </div>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                Competition prototype. No real securities are offered or sold
                through this website.
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-white/50 md:justify-end">
              <a
                href="#overview"
                className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Overview
              </a>

              <a
                href="#security"
                className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Security
              </a>

              <a
                href="#faq"
                className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                FAQ
              </a>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/30 md:text-left">
            © {new Date().getFullYear()} SpaceX Invest
          </div>
        </div>
      </div>
    </footer>
  )
}
