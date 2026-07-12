'use client'

import React, { useState } from 'react'
import { Bookmark, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

type SaveOpportunityButtonProps = {
  opportunityId: string | null
  opportunitySlug: string
  initialSaved: boolean
  authenticated: boolean
}

export default function SaveOpportunityButton({
  opportunityId,
  opportunitySlug,
  initialSaved,
  authenticated
}: SaveOpportunityButtonProps) {
  const router = useRouter()

  const [saved, setSaved] = useState(initialSaved)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle() {
    if (!authenticated) {
      window.location.assign(
        `/login?next=${encodeURIComponent(
          `/opportunities/${opportunitySlug}`
        )}`
      )
      return
    }

    if (!opportunityId) {
      setError('This opportunity is currently unavailable.')
      return
    }

    setSubmitting(true)
    setError('')

    const supabase = createClient()

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        window.location.assign(
          `/login?next=${encodeURIComponent(
            `/opportunities/${opportunitySlug}`
          )}`
        )
        return
      }

      const nextSavedState = !saved
      setSaved(nextSavedState)

      const result = nextSavedState
        ? await supabase
            .from('saved_opportunities')
            .insert({
              user_id: user.id,
              opportunity_id: opportunityId
            })
        : await supabase
            .from('saved_opportunities')
            .delete()
            .eq('user_id', user.id)
            .eq('opportunity_id', opportunityId)

      if (result.error) {
        console.error('Saved opportunity operation failed:', result.error)
        setSaved(!nextSavedState)
        setError(
          nextSavedState
            ? 'The opportunity could not be saved.'
            : 'The opportunity could not be removed.'
        )
        return
      }

      router.refresh()
    } catch {
      setSaved((current) => !current)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={submitting}
        aria-pressed={saved}
        className="btn btn-ghost gap-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <Loader2
            size={17}
            aria-hidden="true"
            className="animate-spin"
          />
        ) : (
          <Bookmark
            size={17}
            aria-hidden="true"
            className={saved ? 'fill-current' : ''}
          />
        )}

        {submitting
          ? 'Updating…'
          : saved
            ? 'Saved'
            : 'Save Opportunity'}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
