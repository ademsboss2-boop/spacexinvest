'use client'

import React, { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

export type PortfolioPerformancePoint = {
  date: string
  totalPnl: number
}

type PortfolioPerformanceChartProps = {
  points: PortfolioPerformancePoint[]
  currentValue: number
  netInvestedCapital: number
  totalPnl: number
  totalRoi: number
  lastValuedAt: string | null
}

type RangeKey = '1M' | '3M' | 'ALL'

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

function percentage(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function chartDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function fullDate(value: string | null) {
  if (!value) {
    return 'Awaiting first valuation'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Valuation date unavailable'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

export default function PortfolioPerformanceChart({
  points,
  currentValue,
  netInvestedCapital,
  totalPnl,
  totalRoi,
  lastValuedAt
}: PortfolioPerformanceChartProps) {
  const [range, setRange] =
    useState<RangeKey>('ALL')

  const filteredPoints = useMemo(() => {
    if (range === 'ALL' || points.length === 0) {
      return points
    }

    const lastPoint = points[points.length - 1]
    const cutoff = new Date(
      `${lastPoint.date}T00:00:00Z`
    )

    cutoff.setUTCMonth(
      cutoff.getUTCMonth() -
        (range === '1M' ? 1 : 3)
    )

    const filtered = points.filter(
      (point) =>
        new Date(
          `${point.date}T00:00:00Z`
        ).getTime() >= cutoff.getTime()
    )

    if (
      filtered.length === 1 &&
      points.length > 1
    ) {
      const firstIndex = points.findIndex(
        (point) => point.date === filtered[0].date
      )

      if (firstIndex > 0) {
        return [
          points[firstIndex - 1],
          ...filtered
        ]
      }
    }

    return filtered
  }, [points, range])

  const chartData = useMemo(
    () =>
      filteredPoints.map((point) => ({
        ...point,
        label: chartDate(point.date)
      })),
    [filteredPoints]
  )

  const positive = totalPnl >= 0
  const chartColor = positive
    ? 'rgba(167,243,208,0.95)'
    : 'rgba(254,202,202,0.95)'

  const ranges: Array<{
    key: RangeKey
    label: string
  }> = [
    { key: '1M', label: '1M' },
    { key: '3M', label: '3M' },
    { key: 'ALL', label: 'All' }
  ]

  return (
    <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/35">
            Performance History
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Cumulative Portfolio P&amp;L
          </h2>

          <p className="mt-2 text-xs text-white/30">
            Last finance valuation: {fullDate(lastValuedAt)}
          </p>
        </div>

        <div
          className="inline-flex w-fit border border-white/10 bg-black/35 p-1"
          aria-label="Performance chart range"
        >
          {ranges.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRange(item.key)}
              aria-pressed={range === item.key}
              className={[
                'min-h-9 px-3 text-[11px] uppercase tracking-[0.12em] transition-colors',
                range === item.key
                  ? 'bg-white text-black'
                  : 'text-white/40 hover:text-white'
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid border border-white/10 sm:grid-cols-3">
        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
            Portfolio Value
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {currency(currentValue)}
          </p>
        </div>

        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
            Net Invested
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {currency(netInvestedCapital)}
          </p>
        </div>

        <div className="p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
            Total P&amp;L
          </p>
          <p
            className={[
              'mt-2 text-lg font-semibold',
              positive
                ? 'text-emerald-100'
                : 'text-red-200'
            ].join(' ')}
          >
            {currency(totalPnl)}
            <span className="ml-2 text-xs font-normal text-white/35">
              {percentage(totalRoi)}
            </span>
          </p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="mt-7 h-[330px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 4,
                bottom: 8,
                left: 4
              }}
            >
              <defs>
                <linearGradient
                  id="portfolioPnlFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={chartColor}
                    stopOpacity={0.26}
                  />
                  <stop
                    offset="100%"
                    stopColor={chartColor}
                    stopOpacity={0.01}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(255,255,255,0.07)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fill: 'rgba(255,255,255,0.38)',
                  fontSize: 11
                }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />

              <YAxis
                tick={{
                  fill: 'rgba(255,255,255,0.38)',
                  fontSize: 11
                }}
                tickFormatter={(value) =>
                  compactCurrency(Number(value))
                }
                tickLine={false}
                axisLine={false}
                width={72}
              />

              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="4 4"
              />

              <Tooltip
                cursor={{
                  stroke: 'rgba(255,255,255,0.15)',
                  strokeDasharray: '4 4'
                }}
                contentStyle={{
                  background: '#080808',
                  border:
                    '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 0
                }}
                labelStyle={{
                  color: 'rgba(255,255,255,0.60)'
                }}
                itemStyle={{
                  color: chartColor
                }}
                formatter={(value) => [
                  currency(Number(value)),
                  'Total P&L'
                ]}
              />

              <Area
                type="monotone"
                dataKey="totalPnl"
                name="Total P&L"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#portfolioPnlFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-7 flex min-h-[330px] items-center justify-center border border-dashed border-white/10 bg-black/20 px-6 text-center">
          <div>
            <p className="text-sm font-medium text-white/65">
              Performance history is being prepared
            </p>
            <p className="mt-2 max-w-md text-xs leading-6 text-white/30">
              The chart will appear after Finance records valuation activity for your funded positions.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col justify-between gap-2 border-t border-white/10 pt-4 text-[11px] leading-5 text-white/30 sm:flex-row">
        <span>
          Based on verified capital, valuations, and distributions
        </span>
        <span>
          Finance-recorded values, not live market quotations
        </span>
      </div>
    </section>
  )
}