import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import InvestorActivityClient, {
  type InvestorActivity
} from '../../../components/platform/InvestorActivityClient'
import { createClient } from '../../../lib/supabase/server'

type RawActivity = {
  id: string
  event_type: string
  message: string
  created_at: string
  read_at: string | null
  application: {
    reference_code: string
    status: string
    opportunity: {
      title: string
      category: string
    } | null
  } | null
}

export default async function InvestorActivityPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      '/login?next=' +
        encodeURIComponent('/dashboard/activity')
    )
  }

  const { data, error } = await supabase
    .from('application_activity')
    .select(`
      id,
      event_type,
      message,
      created_at,
      read_at,
      application:investment_applications (
        reference_code,
        status,
        opportunity:opportunities (
          title,
          category
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(
      `Unable to load investor activity: ${error.message}`
    )
  }

  const rawActivities =
    (data ?? []) as unknown as RawActivity[]

  const activities: InvestorActivity[] =
    rawActivities.map((activity) => ({
      id: activity.id,
      eventType: activity.event_type,
      message: activity.message,
      createdAt: activity.created_at,
      readAt: activity.read_at,
      application: activity.application
        ? {
            referenceCode:
              activity.application.reference_code,
            status: activity.application.status,
            opportunity: activity.application.opportunity
          }
        : null
    }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <InvestorActivityClient
        initialActivities={activities}
      />

      <PlatformFooter />
    </main>
  )
}
