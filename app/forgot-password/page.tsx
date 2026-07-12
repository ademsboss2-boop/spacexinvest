import React from 'react'
import PlatformHeader from '../../components/platform/PlatformHeader'
import PlatformFooter from '../../components/platform/PlatformFooter'
import ForgotPasswordForm from '../../components/platform/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#070707] to-black text-white">
      <PlatformHeader />

      <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
        <div className="w-full">
          <ForgotPasswordForm />
        </div>
      </section>

      <PlatformFooter />
    </main>
  )
}
