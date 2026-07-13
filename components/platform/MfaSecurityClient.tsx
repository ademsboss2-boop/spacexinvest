'use client'

/* eslint-disable @next/next/no-img-element */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { recordSecurityEvent } from '../../lib/security-events/client'

type TotpFactor = {
  id: string
  friendly_name?: string | null
  status?: string
  created_at?: string
  updated_at?: string
}

type EnrollmentState = {
  factorId: string
  qrCode: string
  secret: string
}

type MfaSecurityClientProps = {
  isStaff: boolean
  required: boolean
  nextDestination: string
}

function formatDate(value?: string) {
  if (!value) {
    return 'Date unavailable'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

export default function MfaSecurityClient({
  isStaff,
  required,
  nextDestination
}: MfaSecurityClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [currentLevel, setCurrentLevel] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [removingId, setRemovingId] =
    useState<string | null>(null)

  const [
    endingOtherSessions,
    setEndingOtherSessions
  ] = useState(false)

  const [enrollment, setEnrollment] =
    useState<EnrollmentState | null>(null)

  const [verificationCode, setVerificationCode] =
    useState('')

  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadSecurityState = useCallback(async () => {
    setLoading(true)
    setError('')

    const [factorResult, assuranceResult] =
      await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      ])

    if (factorResult.error) {
      setError(factorResult.error.message)
      setLoading(false)
      return
    }

    if (assuranceResult.error) {
      setError(assuranceResult.error.message)
      setLoading(false)
      return
    }

    const verifiedFactors = (
      factorResult.data?.totp ?? []
    ).filter(
      (factor) => factor.status === 'verified'
    ) as TotpFactor[]

    setFactors(verifiedFactors)
    setCurrentLevel(
      assuranceResult.data.currentLevel ?? null
    )
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadSecurityState()
  }, [loadSecurityState])

  async function startEnrollment() {
    setEnrolling(true)
    setError('')
    setMessage('')
    setEnrollment(null)
    setVerificationCode('')

    try {
      const { data, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `SpaceX Invest Authenticator ${new Date().toLocaleDateString()}`
        })

      if (enrollError) {
        setError(enrollError.message)
        return
      }

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret
      })
    } catch {
      setError(
        'Authenticator enrollment could not be started.'
      )
    } finally {
      setEnrolling(false)
    }
  }

  async function cancelEnrollment() {
    if (!enrollment) {
      return
    }

    setEnrolling(true)
    setError('')

    try {
      const { error: removeError } =
        await supabase.auth.mfa.unenroll({
          factorId: enrollment.factorId
        })

      if (removeError) {
        setError(removeError.message)
        return
      }

      setEnrollment(null)
      setVerificationCode('')
    } catch {
      setError('Enrollment could not be cancelled.')
    } finally {
      setEnrolling(false)
    }
  }

  async function verifyEnrollment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!enrollment) {
      return
    }

    const code = verificationCode.trim()

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Enter the six-digit code from your authenticator app.'
      )
      return
    }

    setVerifying(true)
    setError('')
    setMessage('')

    try {
      const { error: verifyError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: enrollment.factorId,
          code
        })

      if (verifyError) {
        await recordSecurityEvent(
          supabase,
          'mfa_verification_failed',
          {
            context: 'factor_enrollment'
          }
        )

        setError(verifyError.message)
        return
      }

      await recordSecurityEvent(
        supabase,
        'mfa_enrolled',
        {
          factor_type: 'totp'
        }
      )

      setEnrollment(null)
      setVerificationCode('')
      setMessage(
        'Authenticator MFA is enabled and this session is verified.'
      )

      await loadSecurityState()
      router.refresh()

      if (required) {
        router.replace(nextDestination)
        router.refresh()
      }
    } catch {
      setError(
        'The verification code could not be confirmed.'
      )
    } finally {
      setVerifying(false)
    }
  }

  async function copySecret() {
    if (!enrollment?.secret) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        enrollment.secret
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1800)
    } catch {
      setError(
        'The secret could not be copied automatically.'
      )
    }
  }

  async function removeFactor(factor: TotpFactor) {
    if (currentLevel !== 'aal2') {
      router.push(
        `/auth/mfa?next=${encodeURIComponent(
          '/dashboard/security'
        )}`
      )
      return
    }

    const confirmed = window.confirm(
      'Remove this authenticator factor? You may lose access to staff tools until MFA is enrolled again.'
    )

    if (!confirmed) {
      return
    }

    setRemovingId(factor.id)
    setError('')
    setMessage('')

    try {
      const { error: removeError } =
        await supabase.auth.mfa.unenroll({
          factorId: factor.id
        })

      if (removeError) {
        setError(removeError.message)
        return
      }

      await recordSecurityEvent(
        supabase,
        'mfa_factor_removed',
        {
          factor_type: 'totp'
        }
      )

      setMessage(
        'The authenticator factor was removed.'
      )

      await loadSecurityState()
      router.refresh()
    } catch {
      setError(
        'The authenticator factor could not be removed.'
      )
    } finally {
      setRemovingId(null)
    }
  }

  async function signOutOtherSessions() {
    if (isStaff && currentLevel !== 'aal2') {
      router.push(
        `/auth/mfa?next=${encodeURIComponent(
          '/dashboard/security'
        )}`
      )
      return
    }

    const confirmed = window.confirm(
      'Sign out every other browser and device session? Your current session will remain active.'
    )

    if (!confirmed) {
      return
    }

    setEndingOtherSessions(true)
    setError('')
    setMessage('')

    try {
      const { error: signOutError } =
        await supabase.auth.signOut({
          scope: 'others'
        })

      if (signOutError) {
        await recordSecurityEvent(
          supabase,
          'session_control_failed',
          {
            action: 'sign_out_other_sessions',
            reason: 'provider_request_failed'
          }
        )

        setError(
          'Your other sessions could not be signed out.'
        )
        return
      }

      await recordSecurityEvent(
        supabase,
        'other_sessions_signed_out',
        {
          action: 'sign_out_other_sessions'
        }
      )

      setMessage(
        'Other browser and device sessions were signed out successfully.'
      )
    } catch {
      await recordSecurityEvent(
        supabase,
        'session_control_failed',
        {
          action: 'sign_out_other_sessions',
          reason: 'unexpected_client_error'
        }
      )

      setError(
        'Something went wrong while signing out other sessions.'
      )
    } finally {
      setEndingOtherSessions(false)
    }
  }

  const sessionVerified = currentLevel === 'aal2'
  const hasVerifiedFactor = factors.length > 0

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="border border-white/10 bg-white/[0.025]">
        <div className="border-b border-white/10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
              <ShieldCheck
                size={21}
                aria-hidden="true"
                className="text-white/65"
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                Account Protection
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-white">
                Multi-Factor Authentication
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/45">
                Use an authenticator app to protect your
                account with a rotating six-digit security
                code.
              </p>
            </div>
          </div>
        </div>

        {required ? (
          <div className="border-b border-amber-300/15 bg-amber-300/[0.06] p-5 sm:px-8">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={17}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-amber-200"
              />

              <p className="text-sm leading-6 text-amber-100/75">
                MFA must be completed before continuing to
                the requested staff area.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid border-b border-white/10 sm:grid-cols-3">
          <div className="border-b border-white/10 p-6 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">
              Account type
            </p>

            <p className="mt-3 text-sm text-white/75">
              {isStaff
                ? 'Privileged staff account'
                : 'Investor account'}
            </p>
          </div>

          <div className="border-b border-white/10 p-6 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">
              Authenticator
            </p>

            <p className="mt-3 text-sm text-white/75">
              {loading
                ? 'Checking…'
                : hasVerifiedFactor
                  ? 'Enabled'
                  : 'Not enabled'}
            </p>
          </div>

          <div className="p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">
              Current session
            </p>

            <p className="mt-3 text-sm text-white/75">
              {loading
                ? 'Checking…'
                : sessionVerified
                  ? 'MFA verified'
                  : 'Password verified only'}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {error ? (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 border border-red-300/15 bg-red-300/[0.06] p-4 text-sm leading-6 text-red-100/75"
            >
              <XCircle
                size={16}
                aria-hidden="true"
                className="mt-1 shrink-0"
              />

              {error}
            </div>
          ) : null}

          {message ? (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-100/75"
            >
              <CheckCircle2
                size={16}
                aria-hidden="true"
                className="mt-1 shrink-0"
              />

              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-white/40">
              <Loader2
                size={18}
                aria-hidden="true"
                className="animate-spin"
              />
              Checking security settings
            </div>
          ) : enrollment ? (
            <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
              <div className="border border-white/10 bg-white p-5">
                <img
                  src={enrollment.qrCode}
                  alt="Authenticator enrollment QR code"
                  className="mx-auto aspect-square w-full max-w-[280px]"
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                  Enrollment in progress
                </p>

                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Scan the QR code
                </h2>

                <p className="mt-4 text-sm leading-7 text-white/45">
                  Scan the code with your authenticator app,
                  then enter the six-digit code it generates.
                </p>

                <div className="mt-6 border border-white/10 bg-black/35 p-4">
                  <p className="text-xs uppercase tracking-[0.13em] text-white/30">
                    Manual setup secret
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <code className="min-w-0 flex-1 break-all text-sm text-white/70">
                      {enrollment.secret}
                    </code>

                    <button
                      type="button"
                      onClick={copySecret}
                      className="flex min-h-10 min-w-10 shrink-0 items-center justify-center border border-white/10 text-white/55 hover:text-white"
                      aria-label="Copy authenticator secret"
                    >
                      {copied ? (
                        <Check
                          size={15}
                          aria-hidden="true"
                        />
                      ) : (
                        <Clipboard
                          size={15}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={verifyEnrollment}
                  className="mt-6"
                >
                  <label
                    htmlFor="mfa-enrollment-code"
                    className="text-xs uppercase tracking-[0.14em] text-white/40"
                  >
                    Six-digit code
                  </label>

                  <input
                    id="mfa-enrollment-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verificationCode}
                    disabled={verifying}
                    onChange={(event) => {
                      setVerificationCode(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6)
                      )
                      setError('')
                    }}
                    placeholder="000000"
                    className="mt-3 min-h-14 w-full border border-white/10 bg-black px-4 text-center text-xl tracking-[0.4em] text-white outline-none focus:border-white/35"
                  />

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={verifying || enrolling}
                      onClick={cancelEnrollment}
                      className="btn btn-ghost min-h-12"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        verifying ||
                        verificationCode.length !== 6
                      }
                      className="btn btn-primary min-h-12 gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {verifying ? (
                        <>
                          <Loader2
                            size={16}
                            aria-hidden="true"
                            className="animate-spin"
                          />
                          Verifying
                        </>
                      ) : (
                        <>
                          <LockKeyhole
                            size={16}
                            aria-hidden="true"
                          />
                          Enable MFA
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : hasVerifiedFactor ? (
            <div>
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      size={20}
                      aria-hidden="true"
                      className="text-emerald-200"
                    />

                    <h2 className="text-xl font-semibold text-white">
                      Authenticator MFA enabled
                    </h2>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/40">
                    {sessionVerified
                      ? 'This session has completed MFA verification.'
                      : 'Verify this session before entering protected staff areas.'}
                  </p>
                </div>

                {!sessionVerified ? (
                  <Link
                    href={`/auth/mfa?next=${encodeURIComponent(
                      nextDestination
                    )}`}
                    className="btn btn-primary min-h-12 gap-2"
                  >
                    <KeyRound
                      size={16}
                      aria-hidden="true"
                    />
                    Verify Session
                  </Link>
                ) : null}
              </div>

              <div className="mt-7 space-y-4">
                {factors.map((factor) => (
                  <article
                    key={factor.id}
                    className="flex flex-col justify-between gap-5 border border-white/10 bg-black/30 p-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
                        <Smartphone
                          size={18}
                          aria-hidden="true"
                          className="text-white/55"
                        />
                      </div>

                      <div>
                        <h3 className="font-medium text-white">
                          {factor.friendly_name ||
                            'Authenticator app'}
                        </h3>

                        <p className="mt-2 text-xs text-white/30">
                          Added{' '}
                          {formatDate(factor.created_at)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={removingId === factor.id}
                      onClick={() => removeFactor(factor)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-300/15 px-4 text-xs text-red-200/65 transition-colors hover:border-red-300/30 hover:text-red-100 disabled:opacity-40"
                    >
                      {removingId === factor.id ? (
                        <Loader2
                          size={14}
                          aria-hidden="true"
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2
                          size={14}
                          aria-hidden="true"
                        />
                      )}

                      Remove Factor
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    size={20}
                    aria-hidden="true"
                    className="text-amber-200"
                  />

                  <h2 className="text-xl font-semibold text-white">
                    Authenticator MFA is not enabled
                  </h2>
                </div>

                <p className="mt-3 max-w-xl text-sm leading-7 text-white/40">
                  Add an authenticator factor before mandatory
                  MFA enforcement is activated for privileged
                  staff accounts.
                </p>
              </div>

              <button
                type="button"
                disabled={enrolling}
                onClick={startEnrollment}
                className="btn btn-primary min-h-12 shrink-0 gap-2"
              >
                {enrolling ? (
                  <>
                    <Loader2
                      size={16}
                      aria-hidden="true"
                      className="animate-spin"
                    />
                    Starting
                  </>
                ) : (
                  <>
                    <Plus
                      size={16}
                      aria-hidden="true"
                    />
                    Set Up Authenticator
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]">
              <LogOut
                size={18}
                aria-hidden="true"
                className="text-white/55"
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                Session Control
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Sign out other sessions
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                Revoke refresh access for every other browser and
                device while keeping this session active.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={endingOtherSessions || loading}
            onClick={signOutOtherSessions}
            className="btn btn-ghost min-h-12 shrink-0 gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {endingOtherSessions ? (
              <>
                <Loader2
                  size={16}
                  aria-hidden="true"
                  className="animate-spin"
                />
                Signing Out
              </>
            ) : (
              <>
                <LogOut size={16} aria-hidden="true" />
                Sign Out Other Sessions
              </>
            )}
          </button>
        </div>

        <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-white/30">
          Already-issued access tokens on another device may remain
          active until their normal expiration time.
        </p>
      </section>
    </div>
  )
}
