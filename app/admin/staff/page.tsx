import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import AdminStaffClient, {
  type StaffAuditRecord,
  type StaffMember
} from '../../../components/platform/AdminStaffClient'
import { createClient } from '../../../lib/supabase/server'

type RawStaffMember = {
  staff_user_id: string
  staff_email: string
  staff_display_name: string
  staff_role: 'reviewer' | 'admin'
  staff_since: string
  email_confirmed: boolean
}

type RawAuditRecord = {
  audit_id: string
  actor_user_id: string | null
  actor_email: string | null
  actor_display_name: string | null
  target_user_id: string | null
  target_email: string | null
  target_display_name: string | null
  action_type: string
  previous_role: string | null
  new_role: string | null
  created_at: string
}

export default async function AdminStaffPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent('/admin/staff')}`
    )
  }

  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!staffRole || staffRole.role !== 'admin') {
    if (
      staffRole?.role === 'reviewer'
    ) {
      redirect('/admin/applications')
    }

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
        '/admin/staff'
      )}`
    )
  }

  const [staffResult, auditResult] = await Promise.all([
    supabase.rpc('list_staff_members'),
    supabase.rpc('list_staff_role_audit', {
      p_limit: 100
    })
  ])

  if (staffResult.error) {
    throw new Error(
      `Unable to load staff members: ${staffResult.error.message}`
    )
  }

  if (auditResult.error) {
    throw new Error(
      `Unable to load staff audit history: ${auditResult.error.message}`
    )
  }

  const rawStaff =
    (staffResult.data ?? []) as RawStaffMember[]

  const rawAudit =
    (auditResult.data ?? []) as RawAuditRecord[]

  const staff: StaffMember[] = rawStaff.map(
    (member) => ({
      staffUserId: member.staff_user_id,
      staffEmail: member.staff_email,
      staffDisplayName: member.staff_display_name,
      staffRole: member.staff_role,
      staffSince: member.staff_since,
      emailConfirmed: member.email_confirmed
    })
  )

  const auditRecords: StaffAuditRecord[] =
    rawAudit.map((record) => ({
      auditId: record.audit_id,
      actorUserId: record.actor_user_id,
      actorEmail: record.actor_email,
      actorDisplayName: record.actor_display_name,
      targetUserId: record.target_user_id,
      targetEmail: record.target_email,
      targetDisplayName: record.target_display_name,
      actionType: record.action_type,
      previousRole: record.previous_role,
      newRole: record.new_role,
      createdAt: record.created_at
    }))

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <AdminStaffClient
        initialStaff={staff}
        initialAudit={auditRecords}
        currentUserId={user.id}
      />

      <PlatformFooter />
    </main>
  )
}
