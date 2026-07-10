import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white py-12">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <div className="logo text-lg">SpaceX Invest</div>
          <div className="mt-3 text-sm text-white/60">A SpaceX-aligned investment platform. Prototype for demonstration purposes.</div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/60">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>

          <div className="mt-6 text-xs text-white/50">© {new Date().getFullYear()} SpaceX Invest</div>
        </div>
      </div>
    </footer>
  )
}
