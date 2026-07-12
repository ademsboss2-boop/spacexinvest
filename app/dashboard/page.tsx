import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../components/platform/PlatformHeader'
import PlatformFooter from '../../components/platform/PlatformFooter'
import DashboardClient, {
  type DashboardApplication
} from '../../components/platform/DashboardClient'
import { createClient } from '../../lib/supabase/server'

type RawApplication = {
  id: string
  amount: number | string
  status: string
  reference_code: string
  submitted_at: string
  opportunity: {
    slug: string
    title: string
    category: string
  } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const [profileResult, applicationsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('investment_applications')
      .select(`
        id,
        amount,
        status,
        reference_code,
        submitted_at,
        opportunity:opportunities (
          slug,
          title,
          category
        )
      `)
      .order('submitted_at', { ascending: false })
  ])

  const displayName =
    profileResult.data?.display_name?.trim() ||
    user.email?.split('@')[0] ||
    'Investor'

  const rawApplications =
    (applicationsResult.data ?? []) as unknown as RawApplication[]

  const applications: DashboardApplication[] = rawApplications.map(
    (application) => ({
      id: application.id,
      amount: Number(application.amount),
      status: application.status,
      referenceCode: application.reference_code,
      submittedAt: application.submitted_at,
      opportunity: application.opportunity
    })
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#060606] to-black text-white">
      <PlatformHeader />

      <DashboardClient
        displayName={displayName}
        applications={applications}
      />

      <PlatformFooter />
    </main>
  )
}
