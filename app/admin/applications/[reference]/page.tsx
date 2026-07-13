import React from 'react'
import { notFound, redirect } from 'next/navigation'
import PlatformHeader from '../../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../../components/platform/PlatformFooter'
import AdminComplianceRecordClient, {
  type AdminAuditRecord,
  type AdminComplianceApplication,
  type AdminReviewNote
} from '../../../../components/platform/AdminComplianceRecordClient'
import { createClient } from '../../../../lib/supabase/server'

type PageProps = {
  params: Promise<{
    reference: string
  }>
}

type RawApplication = {
  id: string
  user_id: string
  amount: number | string
  status: string
  reference_code: string
  submitted_at: string
  updated_at: string
  opportunity: {
    slug: string
    title: string
    category: string
  } | null
}

type RawAuditRecord = {
  id: string
  actor_user_id: string | null
  action_type: string
  previous_status: string | null
  new_status: string | null
  metadata: unknown
  created_at: string
}

type RawReviewNote = {
  id: string
  author_user_id: string
  note: string
  created_at: string
}

type RawProfile = {
  id: string
  display_name: string
}

export default async function AdminComplianceRecordPage({
  params
}: PageProps) {
  const { reference } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    const destination =
      `/admin/applications/${encodeURIComponent(reference)}`

    redirect(
      `/login?next=${encodeURIComponent(destination)}`
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

  const complianceDestination =
    `/admin/applications/${encodeURIComponent(
      reference
    )}`

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()

  if (
    assuranceError ||
    assurance.currentLevel !== 'aal2'
  ) {
    redirect(
      `/auth/mfa?next=${encodeURIComponent(
        complianceDestination
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
        updated_at,
        opportunity:opportunities (
          slug,
          title,
          category
        )
      `)
      .eq('reference_code', reference)
      .maybeSingle()

  if (applicationError || !applicationData) {
    notFound()
  }

  const application =
    applicationData as unknown as RawApplication

  const [auditResult, notesResult] = await Promise.all([
    supabase
      .from('application_audit_log')
      .select(`
        id,
        actor_user_id,
        action_type,
        previous_status,
        new_status,
        metadata,
        created_at
      `)
      .eq('application_id', application.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('application_review_notes')
      .select(`
        id,
        author_user_id,
        note,
        created_at
      `)
      .eq('application_id', application.id)
      .order('created_at', { ascending: false })
  ])

  if (auditResult.error) {
    throw new Error(
      `Unable to load audit history: ${auditResult.error.message}`
    )
  }

  if (notesResult.error) {
    throw new Error(
      `Unable to load internal notes: ${notesResult.error.message}`
    )
  }

  const rawAuditRecords =
    (auditResult.data ?? []) as RawAuditRecord[]

  const rawReviewNotes =
    (notesResult.data ?? []) as RawReviewNote[]

  const relatedProfileIds = Array.from(
    new Set(
      [
        application.user_id,
        ...rawAuditRecords
          .map((record) => record.actor_user_id)
          .filter((value): value is string =>
            Boolean(value)
          ),
        ...rawReviewNotes.map(
          (note) => note.author_user_id
        )
      ]
    )
  )

  let rawProfiles: RawProfile[] = []

  if (relatedProfileIds.length > 0) {
    const { data: profileData, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', relatedProfileIds)

    if (profileError) {
      throw new Error(
        `Unable to load account profiles: ${profileError.message}`
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

  const complianceApplication: AdminComplianceApplication = {
    id: application.id,
    referenceCode: application.reference_code,
    applicantId: application.user_id,
    applicantName:
      profileNames.get(application.user_id) ||
      `Investor ${application.user_id.slice(0, 8)}`,
    amount: Number(application.amount),
    status: application.status,
    submittedAt: application.submitted_at,
    updatedAt: application.updated_at,
    opportunity: application.opportunity
  }

  const auditRecords: AdminAuditRecord[] =
    rawAuditRecords.map((record) => ({
      id: record.id,
      actionType: record.action_type,
      previousStatus: record.previous_status,
      newStatus: record.new_status,
      actorUserId: record.actor_user_id,
      actorName: record.actor_user_id
        ? profileNames.get(record.actor_user_id) ||
          `Staff ${record.actor_user_id.slice(0, 8)}`
        : 'System',
      metadata:
        record.metadata &&
        typeof record.metadata === 'object' &&
        !Array.isArray(record.metadata)
          ? (record.metadata as Record<string, unknown>)
          : {},
      createdAt: record.created_at
    }))

  const reviewNotes: AdminReviewNote[] =
    rawReviewNotes.map((note) => ({
      id: note.id,
      note: note.note,
      authorUserId: note.author_user_id,
      authorName:
        profileNames.get(note.author_user_id) ||
        `Staff ${note.author_user_id.slice(0, 8)}`,
      createdAt: note.created_at
    }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <AdminComplianceRecordClient
        application={complianceApplication}
        auditRecords={auditRecords}
        reviewNotes={reviewNotes}
      />

      <PlatformFooter />
    </main>
  )
}
