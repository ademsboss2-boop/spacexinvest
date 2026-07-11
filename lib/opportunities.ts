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
}

export const OPPORTUNITIES: Opportunity[] = [
  {
    slug: 'starlink-growth-series',
    title: 'Starlink Growth Series',
    category: 'Private',
    subtitle: 'Series A–B secondary access',
    summary:
      'A private allocation focused on the continued growth of satellite connectivity infrastructure.',
    minimumInvestment: 25000,
    formattedMinimum: '$25,000',
    media: '/media/section-objects/why-starlink.png',
    overview:
      'The Starlink Growth Series is designed around expanding satellite connectivity, network capacity, and global infrastructure.',
    investmentThesis:
      'Continued demand for high-speed global connectivity may support long-term growth across satellite deployment, network services, and supporting infrastructure.',
    highlights: [
      'Exposure to global satellite-connectivity infrastructure',
      'Engineering-led opportunity assessment',
      'Long-term focus on network expansion and adoption'
    ],
    risks: [
      'Technology and execution risk',
      'Limited liquidity for private allocations',
      'Market, valuation, and regulatory uncertainty'
    ],
    metrics: [
      {
        label: 'Target IRR',
        value: '14%–22%',
        note: 'Target range; not guaranteed'
      },
      {
        label: 'Target Hold Period',
        value: '3–7 years',
        note: 'Estimated'
      }
    ],
    status: 'Coming Soon'
  },
  {
    slug: 'launch-services-co-invest',
    title: 'Launch Services Co-Invest',
    category: 'Private',
    subtitle: 'Growth capital for dedicated launch capacity',
    summary:
      'A private opportunity centered on launch capacity, operational scale, and supporting infrastructure.',
    minimumInvestment: 10000,
    formattedMinimum: '$10,000',
    media: '/media/section-objects/opportunities-falcon9.png',
    overview:
      'The Launch Services Co-Invest focuses on expanding launch capacity and the systems required to support reliable access to orbit.',
    investmentThesis:
      'Demand for satellite deployment, research missions, and orbital infrastructure may support continued investment in launch capacity and operational efficiency.',
    highlights: [
      'Exposure to launch-services infrastructure',
      'Focus on operational capacity and efficiency',
      'Engineering-based opportunity assessment'
    ],
    risks: [
      'Operational and execution risk',
      'Concentration within the launch-services market',
      'Private-market liquidity constraints'
    ],
    metrics: [
      {
        label: 'Target IRR',
        value: '10%–18%',
        note: 'Target range; not guaranteed'
      },
      {
        label: 'Target Hold Period',
        value: '2–6 years',
        note: 'Estimated'
      }
    ],
    status: 'Coming Soon'
  },
  {
    slug: 'public-equity-fund',
    title: 'Public Equity Fund',
    category: 'Public',
    subtitle: 'Mission-aligned public equities',
    summary:
      'A diversified public-market strategy focused on space, communications, infrastructure, and advanced technology.',
    minimumInvestment: 5000,
    formattedMinimum: '$5,000',
    media: '/media/section-backgrounds/overview-earth.jpg',
    overview:
      'The Public Equity Fund is designed to provide diversified exposure to publicly traded companies supporting space and global infrastructure.',
    investmentThesis:
      'A diversified portfolio may provide access to long-term growth across satellite communications, aerospace, infrastructure, and advanced technology.',
    highlights: [
      'Diversified public-market exposure',
      'Focus on mission-aligned industries',
      'Combination of active and long-term allocation strategies'
    ],
    risks: [
      'Public-market volatility',
      'Sector concentration risk',
      'Returns are not guaranteed'
    ],
    metrics: [
      {
        label: 'Target Return',
        value: '6%–12%',
        note: 'Target range; not guaranteed'
      },
      {
        label: 'Core Allocation',
        value: 'Satellite & Infrastructure',
        note: 'Subject to market conditions'
      }
    ],
    status: 'Coming Soon'
  }
]

export function getOpportunityBySlug(slug: string) {
  return OPPORTUNITIES.find((opportunity) => opportunity.slug === slug) ?? null
}

export function listOpportunitySlugs() {
  return OPPORTUNITIES.map((opportunity) => opportunity.slug)
}
