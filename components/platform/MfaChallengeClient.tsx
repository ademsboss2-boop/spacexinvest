'use client'

import React, {
  useEffect,
  useMemo,
  useState
} from 'react'
import { useRouter } from 'next/navigation'
import {
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

type TotpFactor = {
  id: string
  friendly_name?: string | null
  status?: string
}

type MfaChallengeClientProps = {
  destination: string
}

export default function MfaChallengeClient({
  destination
}: MfaChallengeClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function initialize() {
      const [factorResult, assuranceResult] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        ])

      if (!active) {
        return
      }

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

      if (
        assuranceResult.data.currentLevel === 'aal2'
      ) {
        router.replace(destination)
        router.refresh()
        return
      }

      const verified = (
        factorResult.data?.totp ?? []
      ).filter(
        (factor) => factor.status === 'verified'
      ) as TotpFactor[]

      if (verified.length === 0) {
        router.replace(
          `/dashboard/security?required=1&next=${encodeURIComponent(
            destination
          )}`
        )
        router.refresh()
        return
      }

      setFactors(verified)
      setFactorId(verified[0].id)
      setLoading(false)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [destination, router, supabase])

  async function handleVerify(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!factorId || !/^\d{6}$/.test(code)) {
      setError(
        'Enter the six-digit code from your authenticator app.'
      )
      return
    }

    setVerifying(true)
    setError('')

    try {
      const { error: verifyError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code
        })

      if (verifyError) {
        setError(verifyError.message)
        return
      }

      router.replace(destination)
      router.refresh()
    } catch {
      setError(
        'The authenticator code could not be verified.'
      )
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[560px] items-center px-4 py-12 sm:px-6">
      <section className="w-full border border-white/10 bg-white/[0.025] p-6 sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-white/[0.04]">
          <ShieldCheck
            size={23}
            aria-hidden="true"
            className="text-white/65"
          />
        </div>

        <p className="mt-7 text-xs uppercase tracking-[0.2em] text-white/35">
          Privileged Session Verification
        </p>

        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-white">
          Enter Security Code
        </h1>

        <p className="mt-4 text-sm leading-7 text-white/45">
          Open your authenticator app and enter the
          current six-digit code.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 border border-red-300/15 bg-red-300/[0.06] p-4 text-sm leading-6 text-red-100/75"
          >
            <XCircle
              size={16}
              aria-hidden="true"
              className="mt-1 shrink-0"
            />

            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 flex min-h-36 items-center justify-center gap-3 text-sm text-white/40">
            <Loader2
              size={18}
              aria-hidden="true"
              className="animate-spin"
            />
            Checking authenticator factors
          </div>
        ) : (
          <form
            onSubmit={handleVerify}
            className="mt-8"
          >
            {factors.length > 1 ? (
              <div className="mb-5">
                <label
                  htmlFor="mfa-factor"
                  className="text-xs uppercase tracking-[0.14em] text-white/40"
                >
                  Authenticator factor
                </label>

                <select
                  id="mfa-factor"
                  value={factorId}
                  disabled={verifying}
                  onChange={(event) =>
                    setFactorId(event.target.value)
                  }
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35"
                >
                  {factors.map((factor, index) => (
                    <option
                      key={factor.id}
                      value={factor.id}
                    >
                      {factor.friendly_name ||
                        `Authenticator ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <label
              htmlFor="mfa-code"
              className="text-xs uppercase tracking-[0.14em] text-white/40"
            >
              Six-digit code
            </label>

            <div className="relative mt-3">
              <KeyRound
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                disabled={verifying}
                autoFocus
                onChange={(event) => {
                  setCode(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                  setError('')
                }}
                placeholder="000000"
                className="min-h-14 w-full border border-white/10 bg-black pl-12 pr-4 text-center text-xl tracking-[0.38em] text-white outline-none focus:border-white/35"
              />
            </div>

            <button
              type="submit"
              disabled={
                verifying || code.length !== 6
              }
              className="btn btn-primary mt-6 min-h-13 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
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
                  Verify and Continue
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
