import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import AdminApplicationsClient, {
  type AdminApplication,
  type ReviewStatus
} from '../../../components/platform/AdminApplicationsClient'
import { createClient } from '../../../lib/supabase/server'

type RawApplication = {
  id: string
  user_id: string
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

type RawProfile = {
  id: string
  display_name: string
}

export default async function AdminApplicationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent('/admin/applications')}`
    )
  }

  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    !staffRole ||
    !['reviewer', 'admin'].includes(staffRole.role)
  ) {
    redirect('/dashboard')
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()

  if (
    assuranceError ||
    assurance.currentLevel !== 'aal2'
  ) {
    redirect(
      `/auth/mfa?next=${encodeURIComponent(
        '/admin/applications'
      )}`
    )
  }

  const { data: applicationData, error: applicationError } =
    await supabase
      .from('investment_applications')
      .select(`
        id,
        user_id,
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

  if (applicationError) {
    throw new Error(
      `Unable to load applications: ${applicationError.message}`
    )
  }

  const rawApplications =
    (applicationData ?? []) as unknown as RawApplication[]

  const applicantIds = Array.from(
    new Set(
      rawApplications.map((application) => application.user_id)
    )
  )

  let rawProfiles: RawProfile[] = []

  if (applicantIds.length > 0) {
    const { data: profileData, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', applicantIds)

    if (profileError) {
      throw new Error(
        `Unable to load applicant profiles: ${profileError.message}`
      )
    }

    rawProfiles = (profileData ?? []) as RawProfile[]
  }

  const profileNames = new Map(
    rawProfiles.map((profile) => [
      profile.id,
      profile.display_name
    ])
  )

  const applications: AdminApplication[] =
    rawApplications.map((application) => ({
      id: application.id,
      amount: Number(application.amount),
      status: application.status as ReviewStatus,
      referenceCode: application.reference_code,
      submittedAt: application.submitted_at,
      applicantId: application.user_id,
      applicantName:
        profileNames.get(application.user_id) ||
        `Investor ${application.user_id.slice(0, 8)}`,
      opportunity: application.opportunity
    }))

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#060606] to-black text-white">
      <PlatformHeader />

      <AdminApplicationsClient
        initialApplications={applications}
      />

      <PlatformFooter />
    </main>
  )
}
