'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import PrototypeNotice from './PrototypeNotice'

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

  function validate() {
    const nextErrors: FormErrors = {}

    if (signup && displayName.trim().length < 2) {
      nextErrors.displayName = 'Enter a sample display name.'
    }

    if (!email.includes('@') || !email.includes('.')) {
      nextErrors.email = 'Enter a valid sample email address.'
    }

    if (password.length < 8) {
      nextErrors.password = 'Password must contain at least 8 characters.'
    }

    if (signup && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (signup && !acceptedTerms) {
      nextErrors.terms = 'Confirm that you understand this is a prototype.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validate()) return

    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-xl">
      <PrototypeNotice>
        {signup
          ? 'Competition prototype. Use sample information only. Nothing entered here is stored or transmitted.'
          : 'Demo access only. Credentials are not stored or transmitted. Use sample information rather than personal information.'}
      </PrototypeNotice>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8"
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
              placeholder="Demo Investor"
              autoComplete="name"
              className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white placeholder:text-white/30 focus:border-white/45 focus:outline-none"
              aria-invalid={Boolean(errors.displayName)}
              aria-describedby={
                errors.displayName ? 'display-name-error' : undefined
              }
            />

            {errors.displayName ? (
              <p
                id="display-name-error"
                className="mt-2 text-sm text-red-300"
              >
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
            placeholder="demo@example.com"
            autoComplete="email"
            className="mt-2 min-h-12 w-full border border-white/15 bg-black/45 px-4 text-white placeholder:text-white/30 focus:border-white/45 focus:outline-none"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />

          {errors.email ? (
            <p id="email-error" className="mt-2 text-sm text-red-300">
              {errors.email}
            </p>
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
              aria-describedby={errors.password ? 'password-error' : undefined}
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
            <p id="password-error" className="mt-2 text-sm text-red-300">
              {errors.password}
            </p>
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
                aria-describedby={
                  errors.confirmPassword ? 'confirm-password-error' : undefined
                }
              />

              {errors.confirmPassword ? (
                <p
                  id="confirm-password-error"
                  className="mt-2 text-sm text-red-300"
                >
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

                <span>
                  I understand this is a fictional competition prototype and
                  does not create a real account.
                </span>
              </label>

              {errors.terms ? (
                <p className="mt-2 text-sm text-red-300">{errors.terms}</p>
              ) : null}
            </div>
          </>
        ) : null}

        <button type="submit" className="btn btn-primary mt-7 w-full">
          {signup ? 'Create Demo Account' : 'Enter Demo Dashboard'}
        </button>

        <p className="mt-6 text-center text-sm text-white/50">
          {signup ? 'Already have demo access?' : 'Need a demo account?'}{' '}
          <Link
            href={signup ? '/login' : '/signup'}
            className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
          >
            {signup ? 'Log in' : 'Sign up'}
          </Link>
        </p>
      </form>
    </div>
  )
}
