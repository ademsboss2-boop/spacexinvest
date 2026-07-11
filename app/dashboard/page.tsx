import React from 'react'
import PlatformHeader from '../../components/platform/PlatformHeader'
import DashboardClient from '../../components/platform/DashboardClient'

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#060606] to-black text-white">
      <PlatformHeader />
      <DashboardClient />
    </main>
  )
}
