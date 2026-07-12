'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    setError('')

    const supabase = createClient()

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim()
      )

    setSubmitting(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="border border-white/10 bg-white/5 p-7 backdrop-blur-md sm:p-8">
        <h1 className="text-2xl font-semibold text-white">
          Check your email
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-white/55">
          If an account exists for that email address, a password
          recovery link has been sent.
        </p>

        <Link href="/login" className="btn btn-primary mt-7">
          Return to Login
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-white/10 bg-white/5 p-7 backdrop-blur-md sm:p-8"
    >
      <h1 className="text-2xl font-semibold text-white">
        Reset your password
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-white/55">
        Enter your account email and we’ll send you a recovery link.
      </p>

      <div className="mt-7">
        <label
          htmlFor="recovery-email"
          className="text-sm font-medium text-white"
        >
          Email address
        </label>

        <input
          id="recovery-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="investor@example.com"
          className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white placeholder:text-white/30 focus:border-white/45 focus:outline-none"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send Recovery Email'}
      </button>

      <p className="mt-6 text-center text-sm text-white/45">
        Remembered your password?{' '}
        <Link
          href="/login"
          className="text-white underline decoration-white/30 underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </form>
  )
}
