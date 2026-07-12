'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Opportunity } from '../../lib/opportunities'
import { createClient } from '../../lib/supabase/client'

type InvestmentFlowProps = {
  opportunity: Opportunity
}

type Step = 1 | 2 | 3

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

export default function InvestmentFlow({
  opportunity
}: InvestmentFlowProps) {
  const [step, setStep] = useState<Step>(1)
  const [amount, setAmount] = useState(
    String(opportunity.minimumInvestment)
  )
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState('')
  const [applicationStatus, setApplicationStatus] = useState('submitted')

  const numericAmount = useMemo(() => {
    const parsed = Number(amount.replace(/[^0-9.]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }, [amount])

  const quickAmounts = [
    opportunity.minimumInvestment,
    opportunity.minimumInvestment * 2,
    opportunity.minimumInvestment * 3
  ]

  function continueToReview() {
    if (numericAmount < opportunity.minimumInvestment) {
      setError(
        `The investment amount must be at least ${opportunity.formattedMinimum}.`
      )
      return
    }

    setError('')
    setSubmitError('')
    setStep(2)
  }

  async function confirmInvestment() {
    setSubmitting(true)
    setSubmitError('')

    const supabase = createClient()

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        window.location.assign(
          `/login?next=${encodeURIComponent(
            `/invest/${opportunity.slug}`
          )}`
        )
        return
      }

      const {
        data: opportunityRow,
        error: opportunityError
      } = await supabase
        .from('opportunities')
        .select('id, minimum_investment')
        .eq('slug', opportunity.slug)
        .single()

      if (opportunityError || !opportunityRow) {
        setSubmitError(
          'This opportunity is currently unavailable. Please try again.'
        )
        return
      }

      const databaseMinimum = Number(
        opportunityRow.minimum_investment
      )

      if (numericAmount < databaseMinimum) {
        setSubmitError(
          `The minimum investment is ${formatCurrency(databaseMinimum)}.`
        )
        setStep(1)
        return
      }

      const {
        data: application,
        error: applicationError
      } = await supabase
        .from('investment_applications')
        .insert({
          user_id: user.id,
          opportunity_id: opportunityRow.id,
          amount: numericAmount,
          status: 'submitted'
        })
        .select('id, reference_code, status, submitted_at')
        .single()

      if (applicationError || !application) {
        setSubmitError(
          applicationError?.message ??
            'The investment application could not be submitted.'
        )
        return
      }

      setReference(application.reference_code)
      setApplicationStatus(application.status)
      setStep(3)
    } catch {
      setSubmitError(
        'Something went wrong while submitting the application.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Investment Application
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {opportunity.title}
            </h1>
          </div>

          <div className="text-sm text-white/45">Step {step} of 3</div>
        </div>

        {step === 1 ? (
          <div className="py-8">
            <h2 className="text-xl font-semibold text-white">
              Choose an investment amount
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-white/55">
              The minimum investment for this opportunity is{' '}
              {opportunity.formattedMinimum}.
            </p>

            <div className="mt-7">
              <label
                htmlFor="investment-amount"
                className="text-sm font-medium text-white"
              >
                Investment amount
              </label>

              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-4 flex items-center text-white/45">
                  $
                </span>

                <input
                  id="investment-amount"
                  type="number"
                  min={opportunity.minimumInvestment}
                  step="1000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="min-h-14 w-full border border-white/15 bg-black/45 pl-9 pr-4 text-xl text-white focus:border-white/45 focus:outline-none"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'amount-error' : undefined}
                />
              </div>

              {error ? (
                <p
                  id="amount-error"
                  className="mt-3 text-sm text-red-300"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => {
                    setAmount(String(quickAmount))
                    setError('')
                  }}
                  className="border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {formatCurrency(quickAmount)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={continueToReview}
              className="btn btn-primary mt-8 w-full sm:w-auto"
            >
              Continue to Review
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="py-8">
            <h2 className="text-xl font-semibold text-white">
              Review your application
            </h2>

            <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">Opportunity</span>
                <span className="text-right text-sm font-medium text-white">
                  {opportunity.title}
                </span>
              </div>

              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">
                  Investment amount
                </span>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(numericAmount)}
                </span>
              </div>

              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">
                  Application type
                </span>
                <span className="text-sm font-medium text-white">
                  One-time allocation request
                </span>
              </div>

              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">
                  Payment method
                </span>
                <span className="text-sm font-medium text-white">
                  Not collected
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-white/55">
              Submitting creates an investment application for review. No
              payment information is collected at this stage.
            </p>

            {submitError ? (
              <div
                role="alert"
                className="mt-6 border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200"
              >
                {submitError}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="btn btn-ghost"
              >
                Back
              </button>

              <button
                type="button"
                onClick={confirmInvestment}
                disabled={submitting}
                className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Submitting…'
                  : 'Submit Investment Application'}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center border border-white/20 bg-white/10 text-2xl text-white">
              ✓
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              Application submitted
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-white">
              Under Review
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
              Your application for {formatCurrency(numericAmount)} in{' '}
              {opportunity.title} has been submitted successfully.
            </p>

            <div className="mx-auto mt-7 max-w-md border border-white/10 bg-black/35 p-5 text-left">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Reference
              </div>

              <div className="mt-2 break-all font-mono text-sm text-white">
                {reference}
              </div>

              <div className="mt-5 text-xs uppercase tracking-[0.18em] text-white/40">
                Status
              </div>

              <div className="mt-2 text-sm capitalize text-white">
                {applicationStatus.replaceAll('_', ' ')}
              </div>
            </div>

            <p className="mt-5 text-xs text-white/35">
              No payment was processed.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn btn-primary">
                View Dashboard
              </Link>

              <Link
                href={`/opportunities/${opportunity.slug}`}
                className="btn btn-ghost"
              >
                Back to Opportunity
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
