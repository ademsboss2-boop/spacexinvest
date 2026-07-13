'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

type AccountRole = 'investor' | 'reviewer' | 'admin'

type AccountSettingsClientProps = {
  initialDisplayName: string
  email: string
  emailVerified: boolean
  role: AccountRole
  joinedAt: string
}

function getRoleLabel(role: AccountRole) {
  if (role === 'admin') return 'Administrator'
  if (role === 'reviewer') return 'Application Reviewer'
  return 'Investor'
}

export default function AccountSettingsClient({
  initialDisplayName,
  email,
  emailVerified,
  role,
  joinedAt
}: AccountSettingsClientProps) {
  const router = useRouter()

  const [displayName, setDisplayName] =
    useState(initialDisplayName)

  const [savedDisplayName, setSavedDisplayName] =
    useState(initialDisplayName)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const initials = useMemo(() => {
    const words = savedDisplayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    if (words.length === 0) return 'I'

    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
  }, [savedDisplayName])

  const joinedLabel = useMemo(() => {
    const date = new Date(joinedAt)

    if (Number.isNaN(date.getTime())) {
      return 'Account active'
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(date)
  }, [joinedAt])

  const trimmedDisplayName = displayName.trim()
  const hasChanges =
    trimmedDisplayName !== savedDisplayName.trim()

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    if (trimmedDisplayName.length < 2) {
      setErrorMessage(
        'Your display name must contain at least 2 characters.'
      )
      return
    }

    if (trimmedDisplayName.length > 60) {
      setErrorMessage(
        'Your display name cannot exceed 60 characters.'
      )
      return
    }

    if (!hasChanges) {
      setSuccessMessage('Your profile is already up to date.')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setErrorMessage(
          'Your session could not be verified. Please log in again.'
        )
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: trimmedDisplayName
        })
        .eq('id', user.id)
        .select('display_name')
        .single()

      if (error) {
        console.error('Profile update failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })

        setErrorMessage(
          'We could not update your profile. Please try again.'
        )
        return
      }

      const updatedName =
        data.display_name?.trim() || trimmedDisplayName

      setDisplayName(updatedName)
      setSavedDisplayName(updatedName)
      setSuccessMessage(
        'Your account profile has been updated successfully.'
      )

      router.refresh()
    } catch {
      setErrorMessage(
        'Something went wrong while updating your profile.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function resetChanges() {
    setDisplayName(savedDisplayName)
    setErrorMessage('')
    setSuccessMessage('')
  }

  return (
    <div className="relative overflow-hidden bg-black">
      <section className="relative overflow-hidden border-b border-white/10">
        <Image
          src="/media/section-backgrounds/security-dragon.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/45"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30"
        />

        <div className="relative mx-auto max-w-[1200px] px-4 py-16 sm:py-20 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
            Investor Account
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Account
            <span className="block text-white/45">
              Settings
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
            Manage your investor identity, review account access
            information, and maintain your security credentials.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-6">
            <div className="border border-white/10 bg-white/[0.025] p-6">
              <div className="flex h-20 w-20 items-center justify-center border border-white/15 bg-white/[0.06] text-2xl font-semibold text-white">
                {initials}
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-white">
                {savedDisplayName}
              </h2>

              <p className="mt-2 break-all text-sm text-white/40">
                {email}
              </p>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex items-center gap-3">
                  <BadgeCheck
                    size={17}
                    aria-hidden="true"
                    className="text-white/45"
                  />

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                      Account role
                    </p>

                    <p className="mt-1 text-sm text-white/70">
                      {getRoleLabel(role)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <Clock3
                    size={17}
                    aria-hidden="true"
                    className="text-white/45"
                  />

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                      Member since
                    </p>

                    <p className="mt-1 text-sm text-white/70">
                      {joinedLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="flex min-h-14 items-center justify-between border border-white/10 bg-white/[0.02] px-5 text-sm text-white/55 transition-colors hover:border-white/25 hover:text-white"
            >
              Return to dashboard
              <span aria-hidden="true">→</span>
            </Link>
          </aside>

          <div className="space-y-8">
            <section className="border border-white/10 bg-white/[0.025]">
              <div className="border-b border-white/10 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
                    <UserRound
                      size={19}
                      aria-hidden="true"
                      className="text-white/55"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Profile identity
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-white/40">
                      This name appears throughout your private
                      investor dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 sm:p-8"
              >
                <label
                  htmlFor="settings-display-name"
                  className="text-xs font-medium uppercase tracking-[0.15em] text-white/40"
                >
                  Display name
                </label>

                <div className="relative mt-3">
                  <UserRound
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />

                  <input
                    id="settings-display-name"
                    type="text"
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value)
                      setErrorMessage('')
                      setSuccessMessage('')
                    }}
                    minLength={2}
                    maxLength={60}
                    autoComplete="name"
                    className="min-h-14 w-full border border-white/10 bg-black/40 pl-12 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/35"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-4 text-xs text-white/30">
                  <span>2–60 characters</span>
                  <span>{displayName.length}/60</span>
                </div>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="mt-6 flex items-start gap-3 border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-sm leading-6 text-red-200"
                  >
                    <AlertTriangle
                      size={17}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0"
                    />
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div
                    role="status"
                    className="mt-6 flex items-start gap-3 border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm leading-6 text-emerald-100"
                  >
                    <CheckCircle2
                      size={17}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0"
                    />
                    {successMessage}
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting || !hasChanges}
                    className="btn btn-primary min-h-13 gap-3 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={16}
                          aria-hidden="true"
                          className="animate-spin"
                        />
                        Saving profile
                      </>
                    ) : (
                      <>
                        <Save size={16} aria-hidden="true" />
                        Save changes
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetChanges}
                    disabled={submitting || !hasChanges}
                    className="btn btn-ghost min-h-13 gap-3 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    Reset changes
                  </button>
                </div>
              </form>
            </section>

            <section className="border border-white/10 bg-white/[0.025]">
              <div className="border-b border-white/10 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
                    <Mail
                      size={19}
                      aria-hidden="true"
                      className="text-white/55"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Account access
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-white/40">
                      Review the email address and verification
                      status associated with your account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/10">
                <div className="grid gap-3 p-6 sm:grid-cols-[180px_1fr] sm:p-8">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/30">
                    Email address
                  </p>

                  <div>
                    <p className="break-all text-sm text-white/75">
                      {email}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-white/30">
                      Your login email cannot be changed from this
                      settings page.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 p-6 sm:grid-cols-[180px_1fr] sm:p-8">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/30">
                    Email status
                  </p>

                  <div className="flex items-center gap-2">
                    {emailVerified ? (
                      <>
                        <CheckCircle2
                          size={16}
                          aria-hidden="true"
                          className="text-emerald-200"
                        />

                        <span className="text-sm text-emerald-100">
                          Verified
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle
                          size={16}
                          aria-hidden="true"
                          className="text-amber-200"
                        />

                        <span className="text-sm text-amber-100">
                          Verification pending
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <div
                aria-hidden="true"
                className="absolute right-0 top-0 h-56 w-56 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/[0.035] blur-3xl"
              />

              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
                    <KeyRound
                      size={19}
                      aria-hidden="true"
                      className="text-white/55"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Password and security
                    </h2>

                    <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                      Request a secure password-reset link whenever
                      you need to update your account password.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <Link
                    href="/dashboard/security"
                    className="btn btn-primary min-h-13 gap-3"
                  >
                    <KeyRound size={16} aria-hidden="true" />
                    Manage MFA
                  </Link>

                  <Link
                    href="/forgot-password"
                    className="btn btn-ghost min-h-13 gap-3"
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    Change password
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
