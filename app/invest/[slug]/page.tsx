import React from 'react'
import { notFound, redirect } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import PlatformFooter from '../../../components/platform/PlatformFooter'
import InvestmentFlow from '../../../components/platform/InvestmentFlow'
import { createClient } from '../../../lib/supabase/server'
import {
  getOpportunityBySlug,
  listOpportunitySlugs
} from '../../../lib/opportunities'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return listOpportunitySlugs().map((slug) => ({ slug }))
}

export default async function InvestPage({ params }: PageProps) {
  const { slug } = await params
  const opportunity = getOpportunityBySlug(slug)

  if (!opportunity) {
    notFound()
  }

  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invest/${slug}`)}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#070707] to-black text-white">
      <PlatformHeader />

      <section className="px-4 py-12 md:py-20">
        <InvestmentFlow opportunity={opportunity} />
      </section>

      <PlatformFooter />
    </main>
  )
}
