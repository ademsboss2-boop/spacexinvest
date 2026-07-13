import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import MfaChallengeClient from '../../../components/platform/MfaChallengeClient'
import { createClient } from '../../../lib/supabase/server'

type MfaPageProps = {
  searchParams: Promise<{
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

export default async function MfaPage({
  searchParams
}: MfaPageProps) {
  const params = await searchParams
  const destination = safeDestination(params.next)
  const supabase = await createClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/auth/mfa?next=${destination}`
      )}`
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <PlatformHeader />

      <MfaChallengeClient
        destination={destination}
      />

      <PlatformFooter />
    </main>
  )
}
