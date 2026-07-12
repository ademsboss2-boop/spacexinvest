'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')

    const supabase = createClient()

    const { error: updateError } =
      await supabase.auth.updateUser({
        password
      })

    if (updateError) {
      setSubmitting(false)
      setError(updateError.message)
      return
    }

    await supabase.auth.signOut()

    setSubmitting(false)
    setUpdated(true)
  }

  if (updated) {
    return (
      <div className="border border-white/10 bg-white/5 p-7 backdrop-blur-md sm:p-8">
        <h1 className="text-2xl font-semibold text-white">
          Password updated
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-white/55">
          Your password was changed successfully. Sign in using your
          new password.
        </p>

        <Link href="/login" className="btn btn-primary mt-7">
          Continue to Login
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
        Choose a new password
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-white/55">
        Enter a new password for your SpaceX Invest account.
      </p>

      <div className="mt-7">
        <label
          htmlFor="new-password"
          className="text-sm font-medium text-white"
        >
          New password
        </label>

        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white placeholder:text-white/30 focus:border-white/45 focus:outline-none"
        />
      </div>

      <div className="mt-5">
        <label
          htmlFor="confirm-new-password"
          className="text-sm font-medium text-white"
        >
          Confirm new password
        </label>

        <input
          id="confirm-new-password"
          type="password"
          value={confirmation}
          onChange={(event) =>
            setConfirmation(event.target.value)
          }
          autoComplete="new-password"
          className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white focus:border-white/45 focus:outline-none"
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
        {submitting ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  )
}
