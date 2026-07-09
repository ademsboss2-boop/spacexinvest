import React from 'react'

export default function Footer() {
  return (
    <footer className="py-10 border-t border-[rgba(255,255,255,0.04)] mt-20">
      <div className="container mx-auto text-center text-sm text-muted">
        <div>© {new Date().getFullYear()} SpaceX Invest — Prototype</div>
        <div className="mt-2">This is a prototype UI for demonstration purposes only.</div>
      </div>
    </footer>
  )
}
