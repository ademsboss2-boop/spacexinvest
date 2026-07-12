import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../components/platform/PlatformHeader'
import PlatformFooter from '../../components/platform/PlatformFooter'
import DashboardClient, {
  type DashboardApplication,
  type SavedOpportunity
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

type RawSavedOpportunity = {
  created_at: string
  opportunity: {
    slug: string
    title: string
    category: string
    status: string
    minimum_investment: number | string
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

  const [
    profileResult,
    applicationsResult,
    savedOpportunitiesResult
  ] = await Promise.all([
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
      .order('submitted_at', { ascending: false }),

    supabase
      .from('saved_opportunities')
      .select(`
        created_at,
        opportunity:opportunities (
          slug,
          title,
          category,
          status,
          minimum_investment
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
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

  const rawSavedOpportunities =
    (savedOpportunitiesResult.data ?? []) as unknown as RawSavedOpportunity[]

  const savedOpportunities: SavedOpportunity[] =
    rawSavedOpportunities.map((saved) => ({
      savedAt: saved.created_at,
      opportunity: saved.opportunity
        ? {
            slug: saved.opportunity.slug,
            title: saved.opportunity.title,
            category: saved.opportunity.category,
            status: saved.opportunity.status,
            minimumInvestment: Number(
              saved.opportunity.minimum_investment
            )
          }
        : null
    }))

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#060606] to-black text-white">
      <PlatformHeader />

      <DashboardClient
        displayName={displayName}
        applications={applications}
        savedOpportunities={savedOpportunities}
      />

      <PlatformFooter />
    </main>
  )
}
