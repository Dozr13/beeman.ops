'use client'

import { MinerTable } from '@/components/hut/MinerTable'
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh'
import type { UnitMode } from '@/lib/hut/types'
import { bestHashRaw, classify, formatTH, rawToTH } from '@/lib/hut/types'
import { Badge, Button, Card, CardBody } from '@/lib/hut/ui'
import type { MinerRecordDto } from '@ops/shared'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  ServerCrash,
  ThermometerSun
} from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useMemo, useState } from 'react'
import { HutGraphs } from './HutGraphs'

type SourceMode = 'LIVE' | 'JSON'

type StatChip = {
  tone: 'ok' | 'warn' | 'crit' | 'muted'
  label: string
}

const dedupeMinersByIp = (miners: MinerRecordDto[]) => {
  const pickBetter = (a: MinerRecordDto, b: MinerRecordDto) => {
    const at = a.ts ? Date.parse(a.ts) : NaN
    const bt = b.ts ? Date.parse(b.ts) : NaN
    if (!Number.isNaN(at) && !Number.isNaN(bt)) return bt >= at ? b : a

    const aScore = (a.reachable ? 10 : 0) + (a.api_4028 ? 5 : 0)
    const bScore = (b.reachable ? 10 : 0) + (b.api_4028 ? 5 : 0)
    if (aScore !== bScore) return bScore > aScore ? b : a

    return a
  }

  const map = new Map<string, MinerRecordDto>()
  for (const m of miners) {
    const prev = map.get(m.ip)
    map.set(m.ip, prev ? pickBetter(prev, m) : m)
  }
  return Array.from(map.values())
}

const StatHeader: React.FC<{
  title: string
  subtitle?: string
  icon: React.ReactNode
}> = ({ title, subtitle, icon }) => (
  <div className='flex items-start justify-between gap-3'>
    <div className='min-w-0'>
      <div className='text-sm font-semibold tracking-tight text-zinc-100'>
        {title}
      </div>
      {subtitle ? (
        <div className='mt-1 text-xs text-zinc-400 leading-snug'>
          {subtitle}
        </div>
      ) : null}
    </div>
    <div className='shrink-0 pt-0.5'>{icon}</div>
  </div>
)

const StatCard: React.FC<{
  title: string
  subtitle?: string
  icon: React.ReactNode
  value: React.ReactNode
  subvalue?: React.ReactNode
  chips?: StatChip[]
  className?: string
}> = ({ title, subtitle, icon, value, subvalue, chips, className }) => (
  <Card className={['h-full', className].filter(Boolean).join(' ')}>
    <CardBody className='p-3.5 sm:p-5 min-h-[140px] flex flex-col gap-3'>
      <StatHeader title={title} subtitle={subtitle} icon={icon} />
      <div className='flex-1'>
        <div className='text-2xl sm:text-3xl font-semibold leading-none text-zinc-100'>
          {value}
        </div>
        {subvalue ? (
          <div className='mt-1 text-sm text-zinc-400'>{subvalue}</div>
        ) : null}
      </div>

      {chips?.length ? (
        <div className='mt-auto flex flex-wrap gap-2'>
          {chips.map((c) => (
            <Badge key={c.label} tone={c.tone}>
              {c.label}
            </Badge>
          ))}
        </div>
      ) : null}
    </CardBody>
  </Card>
)

export const HutDashboard: React.FC<{ siteCode: string }> = ({ siteCode }) => {
  const hutCode = siteCode

  const [miners, setMiners] = useState<MinerRecordDto[]>([])
  const [filter, setFilter] = useState<'ALL' | 'CRIT' | 'WARN' | 'OK'>('ALL')
  const [unitMode, setUnitMode] = useState<UnitMode>('auto')
  const [source, setSource] = useState<SourceMode>('LIVE')
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadLive = useCallback(async () => {
    setLoading(true)
    setErr(null)

    const ctrl = new AbortController()
    try {
      const res = await fetch(
        `/api/huts/${encodeURIComponent(hutCode)}/miners`,
        { cache: 'no-store', signal: ctrl.signal }
      )
      if (!res.ok) throw new Error(`GET miners ${res.status}`)
      const data = (await res.json()) as { miners?: MinerRecordDto[] }

      const next = Array.isArray(data.miners) ? data.miners : []
      const unique = dedupeMinersByIp(next)

      setMiners(unique)
      setSource('LIVE')
      setLastFetchedAt(new Date())
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load live miners')
      throw e
    } finally {
      setLoading(false)
      ctrl.abort()
    }
  }, [hutCode])

  useAutoRefresh({
    enabled: source === 'LIVE',
    fn: loadLive,
    intervalMs: 30_000,
    pauseWhenHidden: true,
    minMs: 5_000,
    maxMs: 120_000
  })

  const dataUpdatedAt = useMemo(() => {
    let best = 0
    for (const m of miners) {
      const t = m.ts ? Date.parse(m.ts) : NaN
      if (Number.isFinite(t)) best = Math.max(best, t)
    }
    return best ? new Date(best) : null
  }, [miners])

  const dataAge = useMemo(() => {
    if (!dataUpdatedAt) return null
    const ageMs = Date.now() - dataUpdatedAt.getTime()
    if (ageMs < 0) return 0
    return ageMs
  }, [dataUpdatedAt])

  const ageLabel = useMemo(() => {
    if (dataAge == null) return '—'
    const s = Math.floor(dataAge / 1000)
    if (s < 60) return `${s}s ago`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    return `${h}h ago`
  }, [dataAge])

  const ageTone: 'ok' | 'warn' | 'crit' = useMemo(() => {
    if (dataAge == null) return 'warn'
    if (dataAge > 10 * 60_000) return 'crit'
    if (dataAge > 3 * 60_000) return 'warn'
    return 'ok'
  }, [dataAge])

  const computed = useMemo(() => {
    const rows = miners.map((m) => {
      const raw = bestHashRaw(m as any)
      const th = typeof raw === 'number' ? rawToTH(raw as any, unitMode) : null
      const c = classify(m as any, th)
      return { m, th, c }
    })

    const totalTH = rows.reduce((acc, r) => acc + (r.th ?? 0), 0)
    const totalPH = totalTH / 1000

    const critRows = rows.filter((r) => r.c.bucket === 'CRIT')
    const warnRows = rows.filter((r) => r.c.bucket === 'WARN')
    const okRows = rows.filter((r) => r.c.bucket === 'OK')

    const crit = critRows.length
    const warn = warnRows.length
    const ok = okRows.length

    const crit_unreachable = critRows.filter((r) => !r.m.reachable).length
    const crit_notHashing = critRows.filter(
      (r) => r.m.api_4028 && (r.th == null || r.th < 0.5)
    ).length
    const crit_other = Math.max(0, crit - (crit_unreachable + crit_notHashing))

    const warn_apiDown = warnRows.filter(
      (r) => r.m.reachable && !r.m.api_4028
    ).length
    const warn_overheating = warnRows.filter((r) =>
      (r.m.errors ?? []).includes('overheat')
    ).length
    const warn_other = Math.max(0, warn - (warn_apiDown + warn_overheating))

    const replace = rows.filter((r) => r.c.replace).length

    return {
      totalTH,
      totalPH,
      crit,
      warn,
      ok,
      crit_unreachable,
      crit_notHashing,
      crit_other,
      warn_apiDown,
      warn_overheating,
      warn_other,
      replace
    }
  }, [miners, unitMode])

  return (
    <div className='min-h-screen'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-8 space-y-6'>
        <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='space-y-1'>
            <div className='flex flex-wrap items-center gap-3'>
              <Link
                href='/huts'
                className='text-sm text-zinc-300 hover:text-white'
              >
                ← Huts
              </Link>
              <Link
                href={`/huts/${encodeURIComponent(hutCode)}/edit`}
                className='text-sm text-zinc-300 hover:text-white'
              >
                Edit
              </Link>
            </div>
            <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
              Miner Hut Dashboard{' '}
              <span className='text-zinc-500'>({hutCode})</span>
            </h1>
            <p className='text-sm text-zinc-400'>
              Stored telemetry from the last agent scan. “Last data” is based on
              miner timestamps.
            </p>

            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Badge tone={source === 'LIVE' ? 'ok' : 'muted'}>
                <Radio className='h-3.5 w-3.5' />
                {source}
              </Badge>

              <Badge tone={ageTone}>
                <Clock className='h-3.5 w-3.5' />
                {ageLabel}
              </Badge>

              <span className='text-xs text-zinc-600'>
                {dataUpdatedAt
                  ? `Last data: ${dataUpdatedAt.toLocaleString()}`
                  : 'No data yet'}
                {lastFetchedAt
                  ? ` · Fetched: ${lastFetchedAt.toLocaleTimeString()}`
                  : ''}
              </span>

              <Button
                variant='ghost'
                className='px-3 py-1.5'
                onClick={() => void loadLive()}
                disabled={loading}
              >
                <RefreshCw
                  className={[
                    'h-4 w-4 mr-2',
                    loading ? 'animate-spin' : ''
                  ].join(' ')}
                />
                Refresh
              </Button>
            </div>

            {err ? (
              <div className='mt-2 rounded-xl border border-rose-800/60 bg-rose-500/10 p-3 text-sm text-rose-200'>
                {err}
              </div>
            ) : null}
          </div>

          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            <span className='text-xs text-zinc-500 mr-1'>Hash units</span>
            {(['auto', 'ghs', 'mhs'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setUnitMode(m)}
                className={[
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  unitMode === m
                    ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
                ].join(' ')}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4'>
          <StatCard
            className='lg:col-span-2'
            title='Total Hashrate'
            subtitle='From best available metric'
            icon={<Activity className='h-5 w-5 text-zinc-500' />}
            value={
              <>
                {formatTH(computed.totalTH)}{' '}
                <span className='text-zinc-500'>TH</span>
              </>
            }
            subvalue={
              <>
                {formatTH(computed.totalPH)}{' '}
                <span className='text-zinc-500'>PH</span>
              </>
            }
          />
          <StatCard
            title='Critical'
            subtitle='Dead / not hashing / hard faults'
            icon={<ServerCrash className='h-5 w-5 text-rose-300/80' />}
            value={computed.crit}
            chips={[
              {
                tone: 'crit',
                label: `${computed.crit_unreachable} unreachable`
              },
              {
                tone: 'crit',
                label: `${computed.crit_notHashing} not hashing`
              },
              ...(computed.crit_other
                ? [
                    {
                      tone: 'crit' as const,
                      label: `${computed.crit_other} other`
                    }
                  ]
                : [])
            ]}
          />
          <StatCard
            title='Warnings'
            subtitle='Fixable issues / watchlist'
            icon={<AlertTriangle className='h-5 w-5 text-amber-300/80' />}
            value={computed.warn}
            chips={[
              { tone: 'warn', label: `${computed.warn_apiDown} API down` },
              { tone: 'warn', label: `${computed.warn_overheating} overheat` },
              ...(computed.warn_other
                ? [
                    {
                      tone: 'warn' as const,
                      label: `${computed.warn_other} other`
                    }
                  ]
                : [])
            ]}
          />
          <StatCard
            title='OK'
            subtitle='Looks healthy right now'
            icon={<CheckCircle2 className='h-5 w-5 text-emerald-300/80' />}
            value={computed.ok}
            subvalue={
              <span className='text-xs text-zinc-500'>
                Still check intake/exhaust. Heat kills quietly.
              </span>
            }
          />
          <StatCard
            title='Replace Count'
            subtitle='Bring spares'
            icon={<ThermometerSun className='h-5 w-5 text-zinc-500' />}
            value={computed.replace}
            subvalue={
              <span className='text-xs text-zinc-500'>
                Temp/chip read errors + unreachable.
              </span>
            }
          />
        </div>

        <div className='space-y-4'>
          <HutGraphs siteCode={hutCode} unitMode={unitMode} />
        </div>

        <MinerTable
          miners={miners}
          unitMode={unitMode}
          filter={filter}
          onFilter={setFilter}
        />

        <footer className='text-xs text-zinc-600 pt-2'>
          “AUTO” assumes raw &gt; 1,000,000 means MH/s; otherwise GH/s. Toggle
          if totals look off.
        </footer>
      </div>
    </div>
  )
}
