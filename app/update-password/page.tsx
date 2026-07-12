import React from 'react'
import { redirect } from 'next/navigation'
import PlatformHeader from '../../components/platform/PlatformHeader'
import PlatformFooter from '../../components/platform/PlatformFooter'
import UpdatePasswordForm from '../../components/platform/UpdatePasswordForm'
import { createClient } from '../../lib/supabase/server'

export default async function UpdatePasswordPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#070707] to-black text-white">
      <PlatformHeader />

      <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
        <div className="w-full">
          <UpdatePasswordForm />
        </div>
      </section>

      <PlatformFooter />
    </main>
  )
}
