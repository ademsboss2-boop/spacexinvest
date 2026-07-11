import React from 'react'
import Link from 'next/link'
import PlatformHeader from '../../components/platform/PlatformHeader'
import PlatformFooter from '../../components/platform/PlatformFooter'
import AuthForm from '../../components/platform/AuthForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#080808] to-black text-white">
      <PlatformHeader />

      <section className="px-4 py-12 md:py-20">
        <div className="mx-auto max-w-xl">
          <Link
            href="/"
            className="text-sm text-white/45 transition-colors hover:text-white"
          >
            ← Back home
          </Link>

          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Investor Access
          </p>

          <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight md:text-6xl">
            Log In
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Enter your credentials to access the investor dashboard.
          </p>

          <div className="mt-8">
            <AuthForm mode="login" />
          </div>
        </div>
      </section>
      <PlatformFooter />
    </main>
  )
}
