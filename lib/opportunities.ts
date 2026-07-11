// lib/opportunities.ts
export type Opportunity = {
  slug: string
  title: string
  category: 'Private' | 'Public' | string
  subtitle: string
  summary: string
  minimumInvestment: number
  formattedMinimum: string
  media: string
  overview: string
  investmentThesis: string
  highlights: string[]
  risks: string[]
  metrics: { label: string; value: string; note?: string }[]
  status: string
  prototypeDisclaimer: string
}

export const OPPORTUNITIES: Opportunity[] = [
  {
    slug: 'starlink-growth-series',
    title: 'Starlink Growth Series',
    category: 'Private',
    subtitle: 'Series A–B secondary access',
    summary: 'Targeted private allocation into Starlink growth opportunities (illustrative).',
    minimumInvestment: 25000,
    formattedMinimum: '$25,000',
    media: '/media/section-objects/why-starlink.png',
    overview:
      'Illustrative and prototype overview of Starlink Growth Series. This is prototype content only.',
    investmentThesis:
      'Access to satellite internet growth with illustrative target ranges and engineering-anchored risk mitigation (example only).',
    highlights: [
      'Illustrative: high alignment with mission-driven infrastructure',
      'Prototype: selective secondary access to early rounds',
      'Example only: engineering-aligned diligence'
    ],
    risks: [
      'Illustrative: market & technology risk',
      'Prototype: liquidity limitations for private allocations',
      'Example only: valuations are illustrative'
    ],
    metrics: [
      { label: 'Illustrative Target IRR', value: '14%–22%', note: 'Example only' },
      { label: 'Illustrative Min. Hold', value: '3–7 years', note: 'Prototype' }
    ],
    status: 'Prototype — Closed to real capital',
    prototypeDisclaimer:
      'Prototype data and illustrative figures only. No real securities are offered or sold through this website.'
  },
  {
    slug: 'launch-services-co-invest',
    title: 'Launch Services Co-Invest',
    category: 'Private',
    subtitle: 'Growth capital for dedicated launch capacity',
    summary:
      'Prototype co-invest into launch services expansion; illustrative terms and allocations only.',
    minimumInvestment: 10000,
    formattedMinimum: '$10,000',
    media: '/media/section-objects/opportunities-falcon9.png',
    overview:
      'This page contains an illustrative overview of a launch services co-invest prototype.',
    investmentThesis:
      'Invest in capacity expansions with engineering-driven selection. Illustrative metrics provided.',
    highlights: [
      'Prototype: direct operational exposure (illustrative)',
      'Example only: strategic capacity alignment',
      'Illustrative: engineering due diligence'
    ],
    risks: [
      'Prototype: operational execution risk',
      'Illustrative: concentration risk',
      'Example only: liquidity constraints'
    ],
    metrics: [
      { label: 'Illustrative Target IRR', value: '10%–18%', note: 'Example only' },
      { label: 'Illustrative Min. Hold', value: '2–6 years', note: 'Prototype' }
    ],
    status: 'Prototype — Informational only',
    prototypeDisclaimer:
      'Prototype data and illustrative figures only. No real securities are offered or sold through this website.'
  },
  {
    slug: 'public-equity-fund',
    title: 'Public Equity Fund',
    category: 'Public',
    subtitle: 'Mission-aligned public equities',
    summary:
      'Illustrative, public-equity allocation to mission-aligned companies — prototype only.',
    minimumInvestment: 5000,
    formattedMinimum: '$5,000',
    media: '/media/section-backgrounds/overview-earth.jpg',
    overview:
      'Public Equity Fund (prototype) offers illustrative exposure to mission-aligned public companies.',
    investmentThesis:
      'Public equities with mission alignment and long-term growth assumptions — illustrative only.',
    highlights: [
      'Illustrative: public market access',
      'Prototype: diversified mission exposure',
      'Example only: passive & active mix'
    ],
    risks: [
      'Illustrative: market volatility',
      'Prototype: no guarantee of performance',
      'Example only: scenario-based projections'
    ],
    metrics: [
      { label: 'Illustrative Target Return', value: '6%–12%', note: 'Prototype' },
      { label: 'Example Allocation', value: 'Core satellite & infra', note: 'Illustrative' }
    ],
    status: 'Prototype — Informational',
    prototypeDisclaimer:
      'Prototype data and illustrative figures only. No real securities are offered or sold through this website.'
  }
]

export function getOpportunityBySlug(slug: string) {
  return OPPORTUNITIES.find((o) => o.slug === slug) ?? null
}

export function listOpportunitySlugs() {
  return OPPORTUNITIES.map((o) => o.slug)
}
