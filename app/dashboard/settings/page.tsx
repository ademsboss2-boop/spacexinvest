import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import AccountSettingsClient from '../../../components/platform/AccountSettingsClient'
import { createClient } from '../../../lib/supabase/server'

type StaffRole = {
  role: string
}

export default async function AccountSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      '/login?next=' +
        encodeURIComponent('/dashboard/settings')
    )
  }

  const [profileResult, staffRoleResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle(),

      supabase
        .from('staff_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
    ])

  const displayName =
    profileResult.data?.display_name?.trim() ||
    user.email?.split('@')[0] ||
    'Investor'

  const staffRole =
    staffRoleResult.data as StaffRole | null

  const role =
    staffRole?.role === 'admin'
      ? 'admin'
      : staffRole?.role === 'reviewer'
        ? 'reviewer'
        : 'investor'

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <AccountSettingsClient
        initialDisplayName={displayName}
        email={user.email ?? ''}
        emailVerified={Boolean(user.email_confirmed_at)}
        role={role}
        joinedAt={user.created_at}
      />

      <PlatformFooter />
    </main>
  )
}
