import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full bg-black px-6 py-12 text-white">
      <div className="container mx-auto">
        <div className="mx-auto max-w-6xl text-center">
          <div className="text-lg font-semibold uppercase tracking-wide">
            SpaceX Invest
          </div>

          <p className="mt-3 text-sm text-white/60">
            Competition prototype. No real securities are offered or sold
            through this website.
          </p>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/60">
            <a
              href="#"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Privacy
            </a>

            <a
              href="#"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Terms
            </a>

            <a
              href="#"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Contact
            </a>
          </div>

          <div className="mt-6 text-xs text-white/50">
            © {new Date().getFullYear()} SpaceX Invest
          </div>
        </div>
      </div>
    </footer>
  )
}
