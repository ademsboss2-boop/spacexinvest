'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { recordSecurityEvent } from '../../lib/security-events/client'

type AuthMode = 'login' | 'signup'

type AuthFormProps = {
  mode: AuthMode
}

type FormErrors = Record<string, string>

const inputClass =
  'min-h-14 w-full border border-white/10 bg-black/45 pl-12 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 hover:border-white/20 focus:border-white/40 focus:bg-black/65'

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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')
    setSuccessMessage('')

    const supabase = createClient()
    const destination = getDestination()
    const publicOrigin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
      window.location.origin

    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim()
            },
            emailRedirectTo: `${publicOrigin}/auth/callback?next=${encodeURIComponent(
              destination
            )}`
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

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

      if (error) {
        setSubmitError(error.message)
        return
      }

      const { data: staffRole } = await supabase
        .from('staff_roles')
        .select('role')
        .maybeSingle()

      const isStaff =
        staffRole?.role === 'reviewer' ||
        staffRole?.role === 'finance' ||
        staffRole?.role === 'admin'

      if (isStaff) {
        const {
          data: assurance,
          error: assuranceError
        } = await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel()

        if (
          assuranceError ||
          assurance?.currentLevel !== 'aal2'
        ) {
          await recordSecurityEvent(
            supabase,
            'privileged_challenge_required',
            {
              destination,
              reason: assuranceError
                ? 'assurance_check_failed'
                : 'aal2_required_after_password_login'
            }
          )

          const mfaDestination =
            destination.startsWith('/auth/mfa')
              ? destination
              : `/auth/mfa?next=${encodeURIComponent(
                  destination
                )}`

          router.replace(mfaDestination)
          router.refresh()
          return
        }
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
      <div className="relative overflow-hidden border border-white/10 bg-white/[0.035] p-7 backdrop-blur-xl sm:p-9">
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-44 w-44 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/[0.05] blur-3xl"
        />

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
            <CheckCircle2 size={23} aria-hidden="true" />
          </div>

          <p className="mt-7 text-xs uppercase tracking-[0.2em] text-white/35">
            Verification Required
          </p>

          <h3 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-white">
            Check Your Email
          </h3>

          <p className="mt-5 text-sm leading-7 text-white/50">
            {successMessage}
          </p>

          <Link href="/login" className="btn btn-primary mt-8 w-full">
            Return to Login
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl sm:p-8"
    >
      <div className="space-y-5">
        {signup ? (
          <div>
            <label
              htmlFor="display-name"
              className="text-xs font-medium uppercase tracking-[0.14em] text-white/45"
            >
              Display name
            </label>

            <div className="relative mt-2">
              <UserRound
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setErrors((current) => ({
                    ...current,
                    displayName: ''
                  }))
                }}
                placeholder="Investor name"
                autoComplete="name"
                className={inputClass}
                aria-invalid={Boolean(errors.displayName)}
              />
            </div>

            {errors.displayName ? (
              <p className="mt-2 text-xs text-red-300">
                {errors.displayName}
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label
            htmlFor="email"
            className="text-xs font-medium uppercase tracking-[0.14em] text-white/45"
          >
            Email address
          </label>

          <div className="relative mt-2">
            <Mail
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setErrors((current) => ({
                  ...current,
                  email: ''
                }))
              }}
              placeholder="investor@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className={inputClass}
              aria-invalid={Boolean(errors.email)}
            />
          </div>

          {errors.email ? (
            <p className="mt-2 text-xs text-red-300">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-[0.14em] text-white/45"
            >
              Password
            </label>

            {!signup ? (
              <Link
                href="/forgot-password"
                className="text-xs text-white/35 transition-colors hover:text-white"
              >
                Forgot password?
              </Link>
            ) : null}
          </div>

          <div className="relative mt-2">
            <LockKeyhole
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />

            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrors((current) => ({
                  ...current,
                  password: ''
                }))
              }}
              placeholder={
                signup ? 'At least 8 characters' : 'Enter your password'
              }
              autoComplete={
                signup ? 'new-password' : 'current-password'
              }
              className={`${inputClass} pr-14`}
              aria-invalid={Boolean(errors.password)}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              aria-label={
                showPassword ? 'Hide password' : 'Show password'
              }
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/35 transition-colors hover:text-white"
            >
              {showPassword ? (
                <EyeOff size={17} aria-hidden="true" />
              ) : (
                <Eye size={17} aria-hidden="true" />
              )}
            </button>
          </div>

          {errors.password ? (
            <p className="mt-2 text-xs text-red-300">
              {errors.password}
            </p>
          ) : null}
        </div>

        {signup ? (
          <div>
            <label
              htmlFor="confirm-password"
              className="text-xs font-medium uppercase tracking-[0.14em] text-white/45"
            >
              Confirm password
            </label>

            <div className="relative mt-2">
              <LockKeyhole
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setErrors((current) => ({
                    ...current,
                    confirmPassword: ''
                  }))
                }}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={inputClass}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
            </div>

            {errors.confirmPassword ? (
              <p className="mt-2 text-xs text-red-300">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {signup ? (
        <div className="mt-6 border-y border-white/10 py-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-white/45">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked)
                setErrors((current) => ({
                  ...current,
                  terms: ''
                }))
              }}
              className="mt-1 h-4 w-4 shrink-0 accent-white"
            />

            <span>
              I agree to the Terms of Access and Privacy Policy.
            </span>
          </label>

          {errors.terms ? (
            <p className="mt-2 text-xs text-red-300">
              {errors.terms}
            </p>
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-6 border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-sm leading-6 text-red-200"
        >
          {submitError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary mt-7 min-h-14 w-full gap-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2
              size={17}
              aria-hidden="true"
              className="animate-spin"
            />
            Please wait
          </>
        ) : (
          <>
            {signup ? 'Create Private Account' : 'Enter Dashboard'}
            <ArrowRight size={17} aria-hidden="true" />
          </>
        )}
      </button>

      <div className="mt-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-white/10" />

        <span className="text-[10px] uppercase tracking-[0.16em] text-white/25">
          Secure Access
        </span>

        <span className="h-px flex-1 bg-white/10" />
      </div>

      <p className="mt-6 text-center text-sm text-white/40">
        {signup ? 'Already registered?' : 'Need an account?'}{' '}
        <Link
          href={signup ? '/login' : '/signup'}
          className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white"
        >
          {signup ? 'Log in' : 'Create one'}
        </Link>
      </p>
    </form>
  )
}
