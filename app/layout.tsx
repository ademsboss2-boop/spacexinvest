import './styles/globals.css'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'SpaceX Invest',
  description: 'A premium investment experience by SpaceX — prototype.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* top-level site chrome could go here; kept minimal for the prototype */}
        {children}
      </body>
    </html>
  )
}
