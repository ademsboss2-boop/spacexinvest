'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Opportunity } from '../../lib/opportunities'

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
  const [amount, setAmount] = useState(String(opportunity.minimumInvestment))
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')

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
    setStep(2)
  }

  function confirmInvestment() {
    const nextReference = `SX-INV-${Date.now()
      .toString(36)
      .toUpperCase()}`

    setReference(nextReference)

    try {
      sessionStorage.setItem(
        'spacex-invest-allocation',
        JSON.stringify({
          opportunity: opportunity.title,
          amount: numericAmount,
          reference: nextReference
        })
      )
    } catch {
      // Session storage may be unavailable.
    }

    setStep(3)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mt-6 border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Investment
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
              {opportunity.formattedMinimum}. No payment details will be
              requested.
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
                <p id="amount-error" className="mt-3 text-sm text-red-300">
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
              Review investment
            </h2>

            <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">Opportunity</span>
                <span className="text-right text-sm font-medium text-white">
                  {opportunity.title}
                </span>
              </div>

              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">Investment amount</span>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(numericAmount)}
                </span>
              </div>

              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">Allocation type</span>
                <span className="text-sm font-medium text-white">
                  One-time allocation
                </span>
              </div>

              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">Payment method</span>
                <span className="text-sm font-medium text-white">
                  None required
                </span>
              </div>

              <div className="flex justify-between gap-6 py-5">
                <span className="text-sm text-white/45">Processing fee</span>
                <span className="text-sm font-medium text-white">$0</span>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-white/55">
              Review the information above before confirming. No payment
              information is required at this stage.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-ghost"
              >
                Back
              </button>

              <button
                type="button"
                onClick={confirmInvestment}
                className="btn btn-primary"
              >
                Confirm Investment
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
              Investment submitted
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-white">
              Confirmation
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
              Your investment request for {formatCurrency(numericAmount)} in
              {opportunity.title} has been prepared. No payment was processed.
            </p>

            <div className="mx-auto mt-7 max-w-md border border-white/10 bg-black/35 p-5 text-left">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Reference
              </div>

              <div className="mt-2 break-all font-mono text-sm text-white">
                {reference}
              </div>
            </div>

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
