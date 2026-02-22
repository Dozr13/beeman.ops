'use client'

import type { UnitMode } from '@/lib/hut/types'
import {
  bestHashRaw,
  classify,
  formatInt,
  formatTH,
  rawToTH
} from '@/lib/hut/types'
import { Badge, Button, Card, CardBody, Input } from '@/lib/hut/ui'
import type { MinerRecordDto } from '@ops/shared'
import { ArrowDownUp, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import React, { useMemo, useState } from 'react'

type Row = {
  m: MinerRecordDto
  th: number | null
  bucket: 'OK' | 'WARN' | 'CRIT'
  replace: boolean
  investigate: boolean
  tags: string[]
  ageSec: number | null
}

const toneFor = (bucket: Row['bucket']) =>
  bucket === 'CRIT' ? 'crit' : bucket === 'WARN' ? 'warn' : 'ok'

const fmtAge = (ageSec: number | null) => {
  if (ageSec == null) return '—'
  if (ageSec < 60) return `${ageSec}s`
  const m = Math.floor(ageSec / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm ? `${h}h ${mm}m` : `${h}h`
}

const isFiniteNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

const pill = (active: boolean) =>
  [
    'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition',
    active
      ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
      : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
  ].join(' ')

const chip =
  'rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-300'

export const MinerTable: React.FC<{
  miners: MinerRecordDto[]
  unitMode: UnitMode
  filter: 'ALL' | 'CRIT' | 'WARN' | 'OK'
  onFilter: (f: 'ALL' | 'CRIT' | 'WARN' | 'OK') => void
}> = ({ miners, unitMode, filter, onFilter }) => {
  const STALE_AFTER_SEC = 600

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'th' | 'ip' | 'power' | 'bucket'>(
    'bucket'
  )
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Mobile: one-row expansion at a time
  const [openKey, setOpenKey] = useState<string | null>(null)

  const rows = useMemo<Row[]>(() => {
    const now = Date.now()
    return miners.map((m) => {
      const raw = bestHashRaw(m)
      const th = typeof raw === 'number' ? rawToTH(raw, unitMode) : null
      const c = classify(m, th)

      const ageSec =
        m.ts != null && Number.isFinite(Date.parse(m.ts))
          ? Math.max(0, Math.floor((now - Date.parse(m.ts)) / 1000))
          : null

      return {
        m,
        th,
        bucket: c.bucket,
        replace: c.replace,
        investigate: c.investigate,
        tags: c.errs,
        ageSec
      }
    })
  }, [miners, unitMode])

  const counts = useMemo(() => {
    const c = { ALL: rows.length, CRIT: 0, WARN: 0, OK: 0 } as any
    for (const r of rows) c[r.bucket]++
    return c as { ALL: number; CRIT: number; WARN: number; OK: number }
  }, [rows])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()

    let list = rows

    if (filter !== 'ALL') list = list.filter((r) => r.bucket === filter)

    if (q) {
      list = list.filter((r) => {
        const m = r.m
        const hay = [
          m.loc ?? '',
          m.ip,
          m.pool_user ?? '',
          m.pool_status ?? '',
          ...(m.errors ?? []),
          ...r.tags
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }

    const dir = sortDir === 'asc' ? 1 : -1
    const by = sortBy

    list = [...list].sort((a, b) => {
      if (by === 'bucket') {
        const rank = (x: Row['bucket']) =>
          x === 'CRIT' ? 3 : x === 'WARN' ? 2 : 1
        return (rank(a.bucket) - rank(b.bucket)) * dir
      }
      if (by === 'ip') return a.m.ip.localeCompare(b.m.ip) * dir
      if (by === 'power')
        return ((a.m.power_w ?? -1) - (b.m.power_w ?? -1)) * dir
      return ((a.th ?? -1) - (b.th ?? -1)) * dir
    })

    return list
  }, [rows, filter, search, sortBy, sortDir])

  const toggleSort = (k: typeof sortBy) => {
    if (sortBy === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortBy(k)
      setSortDir(k === 'ip' ? 'asc' : 'desc')
    }
  }

  const keyFor = (m: MinerRecordDto) => `${m.ip}|${m.loc ?? ''}`

  return (
    <Card>
      <CardBody className='p-0'>
        {/* Sticky toolbar (mobile-first) */}
        <div className='sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur'>
          <div className='p-3.5 sm:p-5 space-y-3'>
            {/* Filters */}
            <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2'>
              {(['ALL', 'CRIT', 'WARN', 'OK'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => onFilter(k)}
                  className={[
                    // mobile: fill the cell
                    'w-full sm:w-auto',
                    // tighter pill on mobile
                    'rounded-full border px-3 py-2 text-[13px] font-semibold leading-none transition',
                    filter === k
                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
                  ].join(' ')}
                >
                  <span className='inline-flex w-full items-center justify-between gap-2'>
                    <span>{k}</span>
                    <span className='text-[11px] font-medium text-zinc-500'>
                      {counts[k]}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* Search + sort */}
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div className='w-full sm:w-96'>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search IP / loc / pool / errors…'
                />
              </div>

              {/* Mobile sort controls */}
              <div className='flex items-center gap-2 sm:hidden'>
                <span className='text-xs text-zinc-500'>Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className='w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100'
                >
                  <option value='bucket'>Status</option>
                  <option value='th'>Hash</option>
                  <option value='power'>Power</option>
                  <option value='ip'>IP</option>
                </select>

                <Button
                  variant='ghost'
                  className='px-3 py-2'
                  onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowDownUp className='h-4 w-4' />
                </Button>
              </div>

              {/* Desktop sort hints */}
              <div className='hidden sm:flex items-center gap-2 text-xs text-zinc-500'>
                Click table headers to sort
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='p-3.5 sm:p-5'>
          {/* ✅ Mobile: scan cards + expand */}
          <div className='space-y-3 sm:hidden'>
            {visible.map((r) => {
              const m = r.m
              const tone = toneFor(r.bucket)
              const stale = r.ageSec != null && r.ageSec > STALE_AFTER_SEC
              const k = keyFor(m)
              const open = openKey === k

              const errs = (r.tags.length ? r.tags : (m.errors ?? [])).slice(
                0,
                10
              )
              const tempMax = (m as any).temp_max
              const tempAvg = (m as any).temp_avg
              const fanIn = (m as any).fan_in
              const fanOut = (m as any).fan_out
              const uptime = (m as any).uptime_s

              const hasTemps = isFiniteNum(tempMax) || isFiniteNum(tempAvg)
              const hasFans = isFiniteNum(fanIn) || isFiniteNum(fanOut)

              return (
                <div
                  key={k}
                  className='rounded-2xl border border-zinc-800 bg-zinc-950/25'
                >
                  {/* Header row (tap to expand) */}
                  <button
                    type='button'
                    onClick={() => setOpenKey(open ? null : k)}
                    className='w-full text-left p-3.5'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          {m.loc ? (
                            <span className='rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs font-mono text-zinc-200'>
                              {m.loc}
                            </span>
                          ) : (
                            <span className='text-xs text-zinc-600'>—</span>
                          )}

                          <span className='truncate font-mono text-sm text-zinc-200'>
                            {m.ip}
                          </span>

                          <span className='ml-auto text-zinc-600'>
                            {open ? (
                              <ChevronUp className='h-4 w-4' />
                            ) : (
                              <ChevronDown className='h-4 w-4' />
                            )}
                          </span>
                        </div>

                        <div className='mt-2 flex flex-wrap items-center gap-2'>
                          <Badge tone={tone}>{r.bucket}</Badge>
                          {r.replace ? (
                            <Badge tone='crit'>REPLACE</Badge>
                          ) : null}
                          {r.investigate ? (
                            <Badge tone='warn'>CHECK</Badge>
                          ) : null}

                          {m.api_4028 ? (
                            <Badge tone='muted'>API</Badge>
                          ) : m.reachable ? (
                            <Badge tone='muted'>WEB</Badge>
                          ) : (
                            <Badge tone='crit'>DOWN</Badge>
                          )}

                          {r.ageSec == null ? (
                            <Badge tone='warn'>NO TS</Badge>
                          ) : stale ? (
                            <Badge tone='warn'>STALE {fmtAge(r.ageSec)}</Badge>
                          ) : (
                            <Badge tone='muted'>{fmtAge(r.ageSec)}</Badge>
                          )}
                        </div>
                      </div>

                      <div className='shrink-0 text-right'>
                        <div className='text-xl font-semibold text-zinc-100 leading-none'>
                          {formatTH(r.th)}
                          <span className='ml-1 text-xs text-zinc-500'>TH</span>
                        </div>
                        <div className='mt-1 text-xs text-zinc-500'>
                          {formatInt(m.power_w ?? null)} W
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {open ? (
                    <div className='border-t border-zinc-800 p-3.5 pt-3 space-y-3'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='text-xs text-zinc-500'>Pool</div>
                          <div className='text-sm text-zinc-200'>
                            {m.pool_status ?? (m.api_4028 ? '?' : 'no API')}
                          </div>
                          {m.pool_user ? (
                            <div className='truncate text-xs text-zinc-500'>
                              {m.pool_user}
                            </div>
                          ) : null}
                        </div>

                        <a
                          href={`http://${encodeURIComponent(m.ip)}/`}
                          target='_blank'
                          rel='noreferrer'
                          className='inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200'
                        >
                          Open <ExternalLink className='h-4 w-4' />
                        </a>
                      </div>

                      {hasTemps || hasFans || isFiniteNum(uptime) ? (
                        <div className='grid grid-cols-2 gap-2'>
                          {isFiniteNum(uptime) ? (
                            <div className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-2'>
                              <div className='text-[11px] text-zinc-500'>
                                Uptime
                              </div>
                              <div className='text-sm text-zinc-200'>
                                {formatInt(uptime)}s
                              </div>
                            </div>
                          ) : null}

                          {isFiniteNum(tempMax) ? (
                            <div className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-2'>
                              <div className='text-[11px] text-zinc-500'>
                                Temp max
                              </div>
                              <div className='text-sm text-zinc-200'>
                                {Math.round(tempMax)}°C
                              </div>
                            </div>
                          ) : isFiniteNum(tempAvg) ? (
                            <div className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-2'>
                              <div className='text-[11px] text-zinc-500'>
                                Temp avg
                              </div>
                              <div className='text-sm text-zinc-200'>
                                {Math.round(tempAvg)}°C
                              </div>
                            </div>
                          ) : null}

                          {isFiniteNum(fanIn) ? (
                            <div className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-2'>
                              <div className='text-[11px] text-zinc-500'>
                                Fan in
                              </div>
                              <div className='text-sm text-zinc-200'>
                                {formatInt(fanIn)}
                              </div>
                            </div>
                          ) : null}

                          {isFiniteNum(fanOut) ? (
                            <div className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-2'>
                              <div className='text-[11px] text-zinc-500'>
                                Fan out
                              </div>
                              <div className='text-sm text-zinc-200'>
                                {formatInt(fanOut)}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className='space-y-2'>
                        <div className='text-xs text-zinc-500'>
                          Errors / flags
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {errs.length ? (
                            errs.map((e, i) => (
                              <span key={`${e}-${i}`} className={chip}>
                                {e}
                              </span>
                            ))
                          ) : (
                            <span className='text-xs text-zinc-600'>—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}

            {!visible.length ? (
              <div className='rounded-2xl border border-zinc-800 bg-zinc-950/25 p-6 text-center text-sm text-zinc-500'>
                No rows match filters/search.
              </div>
            ) : null}
          </div>

          {/* ✅ Desktop: table */}
          <div className='hidden sm:block overflow-hidden rounded-xl border border-zinc-800'>
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead className='sticky top-0 z-10 bg-zinc-900/80 backdrop-blur border-b border-zinc-800'>
                  <tr className='text-left text-zinc-300'>
                    <th className='px-4 py-3'>Loc</th>

                    <th className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        IP
                        <Button
                          variant='ghost'
                          className='px-2 py-1'
                          onClick={() => toggleSort('ip')}
                        >
                          <ArrowDownUp className='h-4 w-4' />
                        </Button>
                      </div>
                    </th>

                    <th className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        Status
                        <Button
                          variant='ghost'
                          className='px-2 py-1'
                          onClick={() => toggleSort('bucket')}
                        >
                          <ArrowDownUp className='h-4 w-4' />
                        </Button>
                      </div>
                    </th>

                    <th className='px-4 py-3 text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        Hash (TH)
                        <Button
                          variant='ghost'
                          className='px-2 py-1'
                          onClick={() => toggleSort('th')}
                        >
                          <ArrowDownUp className='h-4 w-4' />
                        </Button>
                      </div>
                    </th>

                    <th className='px-4 py-3 text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        Power (W)
                        <Button
                          variant='ghost'
                          className='px-2 py-1'
                          onClick={() => toggleSort('power')}
                        >
                          <ArrowDownUp className='h-4 w-4' />
                        </Button>
                      </div>
                    </th>

                    <th className='px-4 py-3'>Pool</th>
                    <th className='px-4 py-3'>Flags</th>
                    <th className='px-4 py-3'>Errors</th>
                  </tr>
                </thead>

                <tbody>
                  {visible.map((r) => {
                    const m = r.m
                    const tone = toneFor(r.bucket)
                    const stale = r.ageSec != null && r.ageSec > STALE_AFTER_SEC
                    const errs = (
                      r.tags.length ? r.tags : (m.errors ?? [])
                    ).slice(0, 8)

                    return (
                      <tr
                        key={keyFor(m)}
                        className='border-b border-zinc-900/80 hover:bg-zinc-900/30'
                      >
                        <td className='px-4 py-3'>
                          {m.loc ? (
                            <span className='rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs font-mono text-zinc-200'>
                              {m.loc}
                            </span>
                          ) : (
                            <span className='text-xs text-zinc-600'>—</span>
                          )}
                        </td>

                        <td className='px-4 py-3 font-mono text-zinc-200'>
                          <a
                            href={`http://${encodeURIComponent(m.ip)}/`}
                            target='_blank'
                            rel='noreferrer'
                            className='underline decoration-zinc-700 hover:decoration-zinc-300'
                            title='Open miner UI'
                          >
                            {m.ip}
                          </a>
                        </td>

                        <td className='px-4 py-3'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge tone={tone}>{r.bucket}</Badge>
                            {r.replace ? (
                              <Badge tone='crit'>REPLACE</Badge>
                            ) : null}
                            {r.investigate ? (
                              <Badge tone='warn'>CHECK</Badge>
                            ) : null}

                            {m.api_4028 ? (
                              <Badge tone='muted'>API</Badge>
                            ) : m.reachable ? (
                              <Badge tone='muted'>WEB</Badge>
                            ) : (
                              <Badge tone='crit'>DOWN</Badge>
                            )}

                            {r.ageSec == null ? (
                              <Badge tone='warn'>NO TS</Badge>
                            ) : stale ? (
                              <Badge tone='warn'>
                                STALE {fmtAge(r.ageSec)}
                              </Badge>
                            ) : (
                              <Badge tone='muted'>{fmtAge(r.ageSec)}</Badge>
                            )}
                          </div>
                        </td>

                        <td className='px-4 py-3 text-right font-mono'>
                          {formatTH(r.th)}
                        </td>
                        <td className='px-4 py-3 text-right font-mono'>
                          {formatInt(m.power_w ?? null)}
                        </td>

                        <td className='px-4 py-3'>
                          <div className='text-zinc-200'>
                            {m.pool_status ?? (m.api_4028 ? '?' : 'no API')}
                          </div>
                          <div className='text-xs text-zinc-500 truncate max-w-[34rem]'>
                            {m.pool_user ?? ''}
                          </div>
                        </td>

                        <td className='px-4 py-3'>
                          <div className='flex flex-wrap gap-2'>
                            {!m.reachable ? (
                              <Badge tone='crit'>UNREACHABLE</Badge>
                            ) : null}
                            {m.reachable && !m.api_4028 ? (
                              <Badge tone='warn'>API DOWN</Badge>
                            ) : null}
                            {m.api_4028 && (r.th == null || r.th < 0.5) ? (
                              <Badge tone='crit'>NOT HASHING</Badge>
                            ) : null}
                          </div>
                        </td>

                        <td className='px-4 py-3'>
                          <div className='flex flex-wrap gap-2'>
                            {errs.length ? (
                              errs.map((e, i) => (
                                <span key={`${e}-${i}`} className={chip}>
                                  {e}
                                </span>
                              ))
                            ) : (
                              <span className='text-xs text-zinc-600'>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {!visible.length ? (
                    <tr>
                      <td
                        className='px-4 py-10 text-center text-zinc-500'
                        colSpan={8}
                      >
                        No rows match filters/search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
