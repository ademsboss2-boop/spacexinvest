import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import MfaSecurityClient from '../../../components/platform/MfaSecurityClient'
import { createClient } from '../../../lib/supabase/server'

type SecurityPageProps = {
  searchParams: Promise<{
    required?: string | string[]
    next?: string | string[]
  }>
}

function safeDestination(value: string | string[] | undefined) {
  const destination = Array.isArray(value)
    ? value[0]
    : value

  if (
    destination &&
    destination.startsWith('/') &&
    !destination.startsWith('//')
  ) {
    return destination
  }

  return '/dashboard'
}

export default async function SecurityPage({
  searchParams
}: SecurityPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(
        '/dashboard/security'
      )}`
    )
  }

  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const requiredValue = Array.isArray(params.required)
    ? params.required[0]
    : params.required

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <MfaSecurityClient
        isStaff={
          staffRole?.role === 'reviewer' ||
          staffRole?.role === 'admin'
        }
        required={requiredValue === '1'}
        nextDestination={safeDestination(params.next)}
      />

      <PlatformFooter />
    </main>
  )
}
