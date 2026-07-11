'use client'

import React from 'react'
import Link from 'next/link'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { OPPORTUNITIES } from '../../lib/opportunities'
import PrototypeNotice from './PrototypeNotice'

const HOLDINGS = [
  {
    name: 'Starlink Growth Series',
    value: 35000,
    allocation: '46.7%',
    label: 'Illustrative private allocation'
  },
  {
    name: 'Launch Services Co-Invest',
    value: 25000,
    allocation: '33.3%',
    label: 'Illustrative private allocation'
  },
  {
    name: 'Public Equity Fund',
    value: 15000,
    allocation: '20.0%',
    label: 'Illustrative public allocation'
  }
]

const CHART_COLORS = ['#f5f5f5', '#9ca3af', '#4b5563']

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

export default function DashboardClient() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 md:py-16">
      <PrototypeNotice>
        Demo portfolio with fictional and illustrative data only. Nothing shown
        represents a real account, holding, balance, return, or transaction.
      </PrototypeNotice>

      <div className="mt-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Demo Portfolio
          </p>

          <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white md:text-6xl">
            Welcome, Investor
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">
            Explore a fictional portfolio experience built for the SpaceX
            Invest competition prototype.
          </p>
        </div>

        <Link href="/opportunities" className="btn btn-primary">
          Browse Opportunities
        </Link>
      </div>

      <section
        aria-label="Illustrative portfolio summary"
        className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ['Portfolio Value', '$82,500', 'Illustrative total'],
          ['Total Allocated', '$75,000', 'Prototype allocation'],
          ['Available Balance', '$7,500', 'Demo balance'],
          ['Illustrative Change', '+4.8%', 'Example only']
        ].map(([label, value, note]) => (
          <div
            key={label}
            className="border border-white/10 bg-white/5 p-6 backdrop-blur-md"
          >
            <div className="text-xs uppercase tracking-[0.16em] text-white/40">
              {label}
            </div>

            <div className="mt-5 text-3xl font-semibold text-white">
              {value}
            </div>

            <div className="mt-2 text-xs text-white/35">{note}</div>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Holdings
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Demo Allocations
              </h2>
            </div>

            <span className="text-xs text-white/35">Illustrative data</span>
          </div>

          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {HOLDINGS.map((holding) => (
              <div
                key={holding.name}
                className="grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <h3 className="font-medium text-white">{holding.name}</h3>
                  <p className="mt-1 text-sm text-white/45">{holding.label}</p>
                </div>

                <div className="sm:text-right">
                  <div className="font-semibold text-white">
                    {currency(holding.value)}
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    {holding.allocation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Allocation Mix
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Illustrative Distribution
          </h2>

          <div
            className="mt-6 h-64"
            role="img"
            aria-label="Illustrative allocation chart: Starlink 46.7 percent, Launch Services 33.3 percent, Public Equity Fund 20 percent."
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={HOLDINGS}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {HOLDINGS.map((holding, index) => (
                    <Cell
                      key={holding.name}
                      fill={CHART_COLORS[index]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: '#080808',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 0,
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-3">
            {HOLDINGS.map((holding, index) => (
              <div
                key={holding.name}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ backgroundColor: CHART_COLORS[index] }}
                  />
                  <span className="truncate text-white/55">{holding.name}</span>
                </div>

                <span className="text-white">{holding.allocation}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Recent Activity
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Prototype Timeline
          </h2>

          <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
            {[
              ['Demo allocation reviewed', 'Today', '$25,000 example'],
              ['Portfolio summary generated', 'Yesterday', 'Prototype report'],
              ['Demo account created', 'Jul 10', 'No data stored']
            ].map(([activity, date, detail]) => (
              <div
                key={activity}
                className="flex items-start justify-between gap-5 py-5"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {activity}
                  </div>
                  <div className="mt-1 text-xs text-white/40">{detail}</div>
                </div>

                <div className="text-xs text-white/35">{date}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Recommended
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Explore Opportunities
          </h2>

          <div className="mt-7 space-y-3">
            {OPPORTUNITIES.map((opportunity) => (
              <Link
                key={opportunity.slug}
                href={`/opportunities/${opportunity.slug}`}
                className="block border border-white/10 bg-black/25 p-5 transition-colors hover:bg-white/10"
              >
                <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                  {opportunity.category}
                </div>

                <div className="mt-2 font-medium text-white">
                  {opportunity.title}
                </div>

                <div className="mt-2 text-sm text-white/45">
                  Demo minimum {opportunity.formattedMinimum}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/opportunities" className="btn btn-primary">
          Browse Opportunities
        </Link>

        <Link href="/" className="btn btn-ghost">
          View Landing Page
        </Link>
      </div>
    </div>
  )
}
