'use client'

import type { UnitMode } from '@/lib/hut/types'
import { formatTH, rawToTH } from '@/lib/hut/types'
import { Badge, Button, Card, CardBody } from '@/lib/hut/ui'
import { Activity, HeartPulse } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

type HourPoint = {
  hour: string
  total: number
  unreachable: number
  apiDown: number
  notHashing: number
  // synthetic?: boolean
}

type HourPointWithTH = HourPoint & { th: number | null }

const fmtHour = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit'
  })
}

const isFiniteNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

export const HutGraphs: React.FC<{ siteCode: string; unitMode: UnitMode }> = ({
  siteCode,
  unitMode
}) => {
  const [range, setRange] = useState<'24h' | '7d'>('24h')
  const [view, setView] = useState<'hash' | 'health'>('hash')
  const [data, setData] = useState<HourPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      try {
        setLoading(true)
        setErr(null)

        const days = range === '24h' ? 1 : 7
        const res = await fetch(
          `/api/huts/${encodeURIComponent(siteCode)}/miners/hourly?days=${days}`,
          { cache: 'no-store', signal: ctrl.signal }
        )
        if (!res.ok) throw new Error(`hourly ${res.status}`)
        const json = (await res.json()) as HourPoint[]
        if (!cancelled) setData(Array.isArray(json) ? json : [])
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load hourly data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [siteCode, range])

  const chartData = useMemo<HourPointWithTH[]>(() => {
    return data.map((p) => {
      const thRaw = rawToTH(p.total, unitMode)
      const th = isFiniteNum(thRaw) ? thRaw : null
      return { ...p, th }
    })
  }, [data, unitMode])

  const latest = chartData.at(-1)
  // const isSynthetic = useMemo(
  //   () => chartData.some((p) => p.synthetic),
  //   [chartData]
  // )

  const yDomain = useMemo(() => {
    if (view !== 'hash') return undefined
    if (!chartData.length) return undefined

    const vals = chartData.map((p) => p.th).filter(isFiniteNum)
    if (!vals.length) return undefined

    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const span = Math.max(1, max - min)

    // Pad both sides: 12% of span, minimum 3% of max (prevents “flatline at top”)
    const pad = Math.max(span * 0.12, max * 0.03)

    const lo = Math.max(0, min - pad)
    const hi = max + pad
    return [lo, hi] as [number, number]
  }, [chartData, view])

  return (
    <Card>
      <CardBody className='p-3.5 sm:p-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <div className='text-sm font-semibold text-zinc-100 flex items-center gap-2'>
              {view === 'hash' ? (
                <Activity className='h-4 w-4 text-zinc-400' />
              ) : (
                <HeartPulse className='h-4 w-4 text-zinc-400' />
              )}
              {view === 'hash' ? 'Hashrate' : 'Health'} ({range})
              {loading ? (
                <span className='text-xs text-zinc-500'>…</span>
              ) : null}
            </div>

            <div className='mt-1 text-xs text-zinc-400'>
              Latest:{' '}
              {latest ? (
                <>
                  <span className='text-zinc-200'>
                    {latest.th != null ? `${formatTH(latest.th)} TH` : '—'}
                  </span>
                  <span className='text-zinc-500'>
                    {' '}
                    • unreachable {latest.unreachable} • apiDown{' '}
                    {latest.apiDown} • notHashing {latest.notHashing}
                  </span>
                </>
              ) : (
                '—'
              )}
            </div>

            {err ? (
              <div className='mt-2 rounded-xl border border-rose-800/60 bg-rose-500/10 p-2 text-xs text-rose-200'>
                {err}
              </div>
            ) : null}

            <div className='mt-2 flex flex-wrap gap-2'>
              <Badge tone='muted'>
                {range === '24h' ? 'Last 24h' : 'Last 7d'}
              </Badge>
              {/* <Badge tone={isSynthetic ? 'warn' : 'ok'}>
                {isSynthetic ? 'DEMO (synthetic)' : 'REAL'}
              </Badge> */}

              {latest ? (
                <>
                  <Badge tone={latest.unreachable ? 'crit' : 'muted'}>
                    unreachable {latest.unreachable}
                  </Badge>
                  <Badge tone={latest.apiDown ? 'warn' : 'muted'}>
                    apiDown {latest.apiDown}
                  </Badge>
                  <Badge tone={latest.notHashing ? 'crit' : 'muted'}>
                    notHashing {latest.notHashing}
                  </Badge>
                </>
              ) : null}
            </div>
          </div>

          <div className='flex gap-2 sm:flex-col sm:items-end'>
            <div className='flex gap-2'>
              <Button
                variant='ghost'
                className={view === 'hash' ? 'bg-zinc-800' : ''}
                onClick={() => setView('hash')}
              >
                Hash
              </Button>
              <Button
                variant='ghost'
                className={view === 'health' ? 'bg-zinc-800' : ''}
                onClick={() => setView('health')}
              >
                Health
              </Button>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='ghost'
                className={range === '24h' ? 'bg-zinc-800' : ''}
                onClick={() => setRange('24h')}
              >
                24h
              </Button>
              <Button
                variant='ghost'
                className={range === '7d' ? 'bg-zinc-800' : ''}
                onClick={() => setRange('7d')}
              >
                7d
              </Button>
            </div>
          </div>
        </div>

        <div className='mt-4 h-52 sm:h-60 min-[160px]'>
          <ResponsiveContainer
            width='100%'
            height='100%'
            minWidth={0}
            minHeight={160}
          >
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 12, bottom: 0, left: 6 }}
            >
              <CartesianGrid strokeDasharray='3 3' vertical={false} />

              <XAxis
                dataKey='hour'
                tickFormatter={fmtHour}
                minTickGap={24}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.55)' } as any}
              />

              <YAxis
                domain={yDomain}
                width={36}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.55)' } as any}
                tickFormatter={(v) => String(Math.round(Number(v)))}
              />

              <Tooltip
                contentStyle={{
                  background: 'rgba(10,10,10,0.92)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.75)' }}
                labelFormatter={(v) => fmtHour(String(v))}
                formatter={(v: any, name) => {
                  if (name === 'th')
                    return [`${formatTH(Number(v))} TH`, 'Total']
                  return [v, name]
                }}
              />

              {view === 'hash' ? (
                <Line
                  type='monotone'
                  dataKey='th'
                  dot={false}
                  strokeWidth={2}
                />
              ) : (
                <>
                  <Line
                    type='monotone'
                    dataKey='unreachable'
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type='monotone'
                    dataKey='apiDown'
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type='monotone'
                    dataKey='notHashing'
                    dot={false}
                    strokeWidth={2}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
