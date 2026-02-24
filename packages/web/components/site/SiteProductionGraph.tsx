'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

type MetricKey = 'vol_mcf' | 'mmbtu' | 'flow_hrs'

type DailyPoint = {
  date: string // YYYY-MM-DD
  vol_mcf: number | null
  mmbtu: number | null
  flow_hrs: number | null
}

const pill = (active: boolean) =>
  [
    'rounded-full border px-3 py-1 text-xs font-medium transition',
    active
      ? 'border-zinc-700 bg-zinc-900/60 text-white'
      : 'border-zinc-800 bg-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/30'
  ].join(' ')

const fmt = (v: any) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  return Intl.NumberFormat().format(n)
}

export const SiteProductionGraph = ({ siteId }: { siteId: string }) => {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [metric, setMetric] = useState<MetricKey>('vol_mcf')
  const [data, setData] = useState<DailyPoint[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const title =
    metric === 'vol_mcf'
      ? 'MCF'
      : metric === 'mmbtu'
        ? 'MMBTU'
        : 'Flow hrs'

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(
        `/api/sites/${encodeURIComponent(siteId)}/production/daily?days=${days}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as DailyPoint[]
      setData(Array.isArray(json) ? json : [])
    } catch (e: any) {
      setErr(String(e?.message ?? e))
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // auto-load once
  useMemo(() => {
    if (data == null && !loading) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.map((d) => ({
      ...d,
      value: d[metric]
    }))
  }, [data, metric])

  return (
    <div className='rounded-2xl border border-zinc-800 bg-zinc-950/20 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='text-sm font-semibold text-zinc-100'>Production ({title})</div>
          <div className='text-xs text-zinc-500'>Daily totals across gas meters</div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <button className={pill(metric === 'vol_mcf')} onClick={() => setMetric('vol_mcf')}>
            MCF
          </button>
          <button className={pill(metric === 'mmbtu')} onClick={() => setMetric('mmbtu')}>
            MMBTU
          </button>
          <button className={pill(metric === 'flow_hrs')} onClick={() => setMetric('flow_hrs')}>
            Flow
          </button>

          <span className='mx-1 h-5 w-px bg-zinc-800' />

          <button
            className={pill(days === 7)}
            onClick={() => {
              setDays(7)
              void load()
            }}
          >
            7d
          </button>
          <button
            className={pill(days === 30)}
            onClick={() => {
              setDays(30)
              void load()
            }}
          >
            30d
          </button>
          <button
            className={pill(days === 90)}
            onClick={() => {
              setDays(90)
              void load()
            }}
          >
            90d
          </button>

          <button
            className='ml-1 rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/30'
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {err ? (
        <div className='mt-3 rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-300'>
          {err}
        </div>
      ) : null}

      <div className='mt-4 h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray='3 3' opacity={0.15} />
            <XAxis
              dataKey='date'
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickFormatter={(d) => String(d).slice(5)}
              stroke='currentColor'
              opacity={0.6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'currentColor' }}
              stroke='currentColor'
              opacity={0.6}
              tickFormatter={fmt}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(9,9,11,0.9)',
                border: '1px solid rgba(63,63,70,0.8)',
                borderRadius: 12
              }}
              labelStyle={{ color: 'rgba(228,228,231,0.9)' }}
              formatter={(v: any) => fmt(v)}
            />
            <Bar dataKey='value' fill='currentColor' opacity={0.35} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-2 text-xs text-zinc-500'>
        {data?.length ? `${data.length} days` : 'No history yet.'}
      </div>
    </div>
  )
}
