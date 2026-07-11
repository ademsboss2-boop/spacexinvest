import React from 'react'
import { notFound } from 'next/navigation'
import PlatformHeader from '../../../components/platform/PlatformHeader'
import DemoInvestmentFlow from '../../../components/platform/DemoInvestmentFlow'
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

  if (!opportunity) notFound()

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#070707] to-black text-white">
      <PlatformHeader />

      <section className="px-4 py-12 md:py-20">
        <DemoInvestmentFlow opportunity={opportunity} />
      </section>
    </main>
  )
}
