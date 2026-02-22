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
import { ArrowDownUp } from 'lucide-react'
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
      // th
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

  return (
    <Card>
      <CardBody className='space-y-4'>
        {/* Toolbar */}
        <div className='space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='-mx-1 flex w-full gap-2 overflow-x-auto px-1 py-1'>
              {(['ALL', 'CRIT', 'WARN', 'OK'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => onFilter(k)}
                  className={[
                    'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                    filter === k
                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
                  ].join(' ')}
                >
                  {k}{' '}
                  <span className='ml-1 text-xs text-zinc-500'>
                    ({counts[k]})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <div className='w-full sm:w-96'>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search IP / loc / errors…'
              />
            </div>

            {/* Mobile sort */}
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
          </div>
        </div>

        {/* ✅ Mobile: card list */}
        <div className='space-y-3 sm:hidden'>
          {visible.map((r) => {
            const m = r.m
            const tone = toneFor(r.bucket)
            const stale = r.ageSec != null && r.ageSec > STALE_AFTER_SEC

            return (
              <div
                key={`${m.ip}-${m.loc ?? 'noloc'}`}
                className='rounded-2xl border border-zinc-800 bg-zinc-950/25 p-3.5'
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

                      <a
                        href={`http://${encodeURIComponent(m.ip)}/`}
                        target='_blank'
                        rel='noreferrer'
                        className='truncate font-mono text-sm text-zinc-200 underline decoration-zinc-700'
                      >
                        {m.ip}
                      </a>
                    </div>

                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                      <Badge tone={tone}>{r.bucket}</Badge>
                      {r.replace ? <Badge tone='crit'>REPLACE</Badge> : null}
                      {r.investigate ? <Badge tone='warn'>CHECK</Badge> : null}

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
                    <div className='text-lg font-semibold text-zinc-100'>
                      {formatTH(r.th)}
                      <span className='ml-1 text-xs text-zinc-500'>TH</span>
                    </div>
                    <div className='text-xs text-zinc-500'>
                      {formatInt(m.power_w ?? null)} W
                    </div>
                  </div>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-2'>
                  <div className='text-xs text-zinc-400'>
                    <span className='text-zinc-500'>Pool:</span>{' '}
                    <span className='text-zinc-200'>
                      {m.pool_status ?? (m.api_4028 ? '?' : 'no API')}
                    </span>
                    <div className='truncate text-zinc-500'>
                      {m.pool_user ?? ''}
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    {(r.tags.length ? r.tags : (m.errors ?? []))
                      .slice(0, 8)
                      .map((e, i) => (
                        <span
                          key={`${e}-${i}`}
                          className='rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-300'
                        >
                          {e}
                        </span>
                      ))}
                    {!r.tags.length && !(m.errors ?? []).length ? (
                      <span className='text-xs text-zinc-600'>—</span>
                    ) : null}
                  </div>
                </div>
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

                  return (
                    <tr
                      key={`${m.ip}-${m.loc ?? 'noloc'}`}
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

                          {r.ageSec != null ? (
                            <span
                              className='text-xs text-zinc-500'
                              title={m.ts ?? undefined}
                            >
                              {r.ageSec}s
                            </span>
                          ) : null}
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
                          {r.ageSec == null ? (
                            <Badge tone='warn'>NO TS</Badge>
                          ) : stale ? (
                            <Badge tone='warn'>STALE {r.ageSec}s</Badge>
                          ) : (
                            <Badge tone='muted'>{r.ageSec}s</Badge>
                          )}

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
                          {(r.tags.length ? r.tags : (m.errors ?? []))
                            .slice(0, 8)
                            .map((e, i) => (
                              <span
                                key={`${e}-${i}`}
                                className='rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-300'
                              >
                                {e}
                              </span>
                            ))}
                          {!r.tags.length && !(m.errors ?? []).length ? (
                            <span className='text-xs text-zinc-600'>—</span>
                          ) : null}
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
      </CardBody>
    </Card>
  )
}
