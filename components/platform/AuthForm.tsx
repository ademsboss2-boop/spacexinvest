'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

type AuthMode = 'login' | 'signup'

type AuthFormProps = {
  mode: AuthMode
}

type FormErrors = Record<string, string>

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const signup = mode === 'signup'

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const nextErrors: FormErrors = {}

    if (signup && displayName.trim().length < 2) {
      nextErrors.displayName = 'Enter your display name.'
    }

    if (!email.includes('@') || !email.includes('.')) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (password.length < 8) {
      nextErrors.password = 'Password must contain at least 8 characters.'
    }

    if (signup && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (signup && !acceptedTerms) {
      nextErrors.terms = 'Confirm that you agree to the terms.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  function getDestination() {
    const next = new URLSearchParams(window.location.search).get('next')

    if (
      next &&
      next.startsWith('/') &&
      !next.startsWith('//')
    ) {
      return next
    }

    return '/dashboard'
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')
    setSuccessMessage('')

    const supabase = createClient()
    const destination = getDestination()

    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim()
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`
          }
        })

        if (error) {
          setSubmitError(error.message)
          return
        }

        if (data.session) {
          router.replace(destination)
          router.refresh()
          return
        }

        setSuccessMessage(
          'Account created. Check your email and confirm your address to continue.'
        )
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        setSubmitError(error.message)
        return
      }

      router.replace(destination)
      router.refresh()
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="border border-white/10 bg-white/5 p-7 text-white backdrop-blur-md">
        <h2 className="text-2xl font-semibold">Check your email</h2>

        <p className="mt-4 text-sm leading-relaxed text-white/60">
          {successMessage}
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
      noValidate
      className="border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8"
    >
      {signup ? (
        <div>
          <label
            htmlFor="display-name"
            className="text-sm font-medium text-white"
          >
            Display name
          </label>

          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Investor Name"
            autoComplete="name"
            className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white placeholder:text-white/30 focus:border-white/45 focus:outline-none"
            aria-invalid={Boolean(errors.displayName)}
          />

          {errors.displayName ? (
            <p className="mt-2 text-sm text-red-300">
              {errors.displayName}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={signup ? 'mt-5' : ''}>
        <label htmlFor="email" className="text-sm font-medium text-white">
          Email
        </label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="investor@example.com"
          autoComplete="email"
          className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white placeholder:text-white/30 focus:border-white/45 focus:outline-none"
          aria-invalid={Boolean(errors.email)}
        />

        {errors.email ? (
          <p className="mt-2 text-sm text-red-300">{errors.email}</p>
        ) : null}
      </div>

      <div className="mt-5">
        <label htmlFor="password" className="text-sm font-medium text-white">
          Password
        </label>

        <div className="relative mt-2">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete={signup ? 'new-password' : 'current-password'}
            className="min-h-12 w-full border border-white/15 bg-black/45 px-4 pr-14 text-white placeholder:text-white/30 focus:border-white/45 focus:outline-none"
            aria-invalid={Boolean(errors.password)}
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/55 hover:text-white"
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>

        {errors.password ? (
          <p className="mt-2 text-sm text-red-300">{errors.password}</p>
        ) : null}
      </div>

      {signup ? (
        <>
          <div className="mt-5">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-white"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white focus:border-white/45 focus:outline-none"
              aria-invalid={Boolean(errors.confirmPassword)}
            />

            {errors.confirmPassword ? (
              <p className="mt-2 text-sm text-red-300">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-white/65">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 accent-white"
              />

              <span>I agree to the Terms and Privacy Policy.</span>
            </label>

            {errors.terms ? (
              <p className="mt-2 text-sm text-red-300">{errors.terms}</p>
            ) : null}
          </div>
        </>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className="mt-6 border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {submitError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? 'Please wait…'
          : signup
            ? 'Create Account'
            : 'Continue'}
      </button>

      <p className="mt-6 text-center text-sm text-white/50">
        {signup ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link
          href={signup ? '/login' : '/signup'}
          className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
        >
          {signup ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </form>
  )
}
