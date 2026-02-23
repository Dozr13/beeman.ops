'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import React, { useEffect, useMemo, useState } from 'react'

import { Card, CardBody } from '@/lib/hut/ui'

type Point = {
  date: string
  ts: string
  vol_mcf: number | null
  mmbtu: number | null
  flow_hrs: number | null
}

type Payload = {
  siteId: string
  days: number
  points: Point[]
}

const fmtNum = (v: any) => {
  if (v == null) return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  // Keep it readable on mobile
  return n >= 1000 ? n.toFixed(0) : n.toFixed(2)
}

export const SiteGasGraphs = ({ siteId }: { siteId: string }) => {
  const [data, setData] = useState<Payload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    let cancelled = false
    setErr(null)
    setData(null)

    fetch(`/api/sites/${encodeURIComponent(siteId)}/gas-series?days=${days}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`gas-series ${r.status}`)
        return (await r.json()) as Payload
      })
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e))
      })

    return () => {
      cancelled = true
    }
  }, [siteId, days])

  const points = data?.points ?? []
  const hasData = points.length > 0

  const last = useMemo(() => {
    if (!hasData) return null
    return points[points.length - 1]
  }, [hasData, points])

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">Gas production</div>
            <div className="text-lg font-semibold">Daily totals</div>
            {last ? (
              <div className="text-xs text-zinc-400 mt-1">
                Latest: {last.date} • {fmtNum(last.vol_mcf)} MCF • {fmtNum(last.mmbtu)} MMBTU • {fmtNum(last.flow_hrs)} flow hrs
              </div>
            ) : (
              <div className="text-xs text-zinc-500 mt-1">No gas meter data yet for this site.</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`px-2 py-1 rounded-md text-xs border ${
                days === 30 ? 'bg-zinc-900 border-zinc-700' : 'border-zinc-800'
              }`}
              onClick={() => setDays(30)}
              type="button"
            >
              30d
            </button>
            <button
              className={`px-2 py-1 rounded-md text-xs border ${
                days === 90 ? 'bg-zinc-900 border-zinc-700' : 'border-zinc-800'
              }`}
              onClick={() => setDays(90)}
              type="button"
            >
              90d
            </button>
            <button
              className={`px-2 py-1 rounded-md text-xs border ${
                days === 180 ? 'bg-zinc-900 border-zinc-700' : 'border-zinc-800'
              }`}
              onClick={() => setDays(180)}
              type="button"
            >
              180d
            </button>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-400">Failed to load series: {err}</div>
        ) : null}

        {!hasData ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-zinc-500">
            No points to chart.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => fmtNum(v)} />
                  <Line type="monotone" dataKey="vol_mcf" name="Vol (MCF)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => fmtNum(v)} />
                  <Line type="monotone" dataKey="mmbtu" name="MMBTU" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
