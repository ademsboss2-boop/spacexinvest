import React from 'react'

export default function Footer() {
  return (
    <footer className="py-12 border-t border-[rgba(255,255,255,0.04)] mt-20">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
          <div>
            <div className="logo text-lg">SpaceX Invest</div>
            <div className="small-muted mt-3">A premium investment experience aligned with mission-driven companies and technologies.</div>
          </div>

          <div className="flex gap-8">
            <div>
              <div className="font-semibold">Product</div>
              <ul className="mt-2 small-muted">
                <li>Opportunities</li>
                <li>Reporting</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold">Company</div>
              <ul className="mt-2 small-muted">
                <li>About</li>
                <li>Careers</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm small-muted text-center md:text-left">© {new Date().getFullYear()} SpaceX Invest — Prototype. For demonstration purposes only.</div>
      </div>
    </footer>
  )
}
