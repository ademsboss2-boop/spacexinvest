import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../components/platform/PlatformHeader'
import PlatformFooter from '../../components/platform/PlatformFooter'
import DashboardClient from '../../components/platform/DashboardClient'
import { createClient } from '../../lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#060606] to-black text-white">
      <PlatformHeader />
      <DashboardClient />
      <PlatformFooter />
    </main>
  )
}
