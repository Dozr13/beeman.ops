'use client'

import type { SiteDto } from '@ops/shared'
import { isOnline } from '@ops/shared'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, Pill } from '../ui'
import {
  fmt,
  fmtDate,
  fmtNum,
  getDirectionsUrl,
  getProduction
} from './SiteCardUtils'

const normalize = (v: string) => v.trim().toLowerCase()

const matches = (q: string, s: SiteDto) => {
  const qq = normalize(q)
  if (!qq) return true
  const name = normalize(s.name ?? '')
  const code = normalize(s.code ?? '')
  const type = normalize(s.type ?? '')
  const tz = normalize(s.timezone ?? '')
  const hut = normalize(s.currentHut?.code ?? '')
  return (
    name.includes(qq) ||
    code.includes(qq) ||
    type.includes(qq) ||
    tz.includes(qq) ||
    hut.includes(qq)
  )
}

export const SiteList = ({ sites, q }: { sites: SiteDto[]; q: string }) => {
  const filtered = useMemo(() => sites.filter((s) => matches(q, s)), [sites, q])

  const [openAll, setOpenAll] = useState(false)
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  const isOpen = (id: string) => (openAll ? true : Boolean(openIds[id]))

  const toggleOne = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAll = () => {
    setOpenAll((v) => !v)
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-sm text-zinc-500'>
          Showing <span className='text-zinc-300'>{filtered.length}</span> of{' '}
          <span className='text-zinc-300'>{sites.length}</span>
        </div>

        <button
          type='button'
          onClick={toggleAll}
          className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/40'
        >
          {openAll ? 'Collapse all' : 'Open all'}
        </button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {filtered.map((s) => {
          const open = isOpen(s.id)
          const online = isOnline(s.lastHeartbeat)
          const prod = getProduction(s.meta)
          const ex = s.exampleData ?? null
          const dg = s.dailyGas ?? null
          const directionsUrl = getDirectionsUrl(s)

          const mcf = dg?.totals?.vol_mcf ?? prod.gasMcfpd
          const flow = dg?.totals?.flow_hrs

          return (
            <Card
              key={s.id}
              className='border-zinc-800 bg-zinc-950/20 transition hover:border-zinc-700 hover:bg-zinc-900/20'
            >
              <div className='px-5 pt-5 pb-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <Link
                      href={`/sites/${s.id}`}
                      className='block truncate text-base font-semibold tracking-tight hover:underline'
                    >
                      {s.name ?? s.code}
                    </Link>
                    <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400'>
                      <span className='text-zinc-300'>{s.code}</span>
                      <span className='text-zinc-700'>•</span>
                      <span>{s.type ?? 'UNKNOWN'}</span>
                      <span className='text-zinc-700'>•</span>
                      <span>{s.timezone ?? 'n/a'}</span>
                      {s.currentHut ? (
                        <>
                          <span className='text-zinc-700'>•</span>
                          <span>Hut {s.currentHut.code}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className='shrink-0 flex items-center gap-2'>
                    {/* single primary pill */}
                    <Pill tone={online ? 'good' : 'bad'}>
                      {online ? 'ONLINE' : 'OFFLINE'}
                    </Pill>
                    <button
                      type='button'
                      onClick={() => toggleOne(s.id)}
                      className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/40'
                      aria-expanded={open}
                      aria-controls={`site-details-${s.id}`}
                    >
                      {open ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Compact stats */}
                <div className='mt-4 grid grid-cols-3 gap-2'>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-[11px] text-zinc-500'>MCF</div>
                    <div className='mt-1 truncate text-sm font-semibold text-zinc-200'>
                      {fmtNum(mcf)}
                    </div>
                  </div>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-[11px] text-zinc-500'>Flow hrs</div>
                    <div className='mt-1 truncate text-sm font-semibold text-zinc-200'>
                      {fmtNum(flow)}
                    </div>
                  </div>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-[11px] text-zinc-500'>Last ping</div>
                    <div className='mt-1 truncate text-sm font-semibold text-zinc-200'>
                      {s.lastHeartbeat
                        ? new Date(s.lastHeartbeat).toLocaleDateString()
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Always-visible actions */}
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Link
                    href={`/sites/${s.id}`}
                    className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                  >
                    View
                  </Link>

                  <Link
                    href={`/sites/${s.id}/edit`}
                    className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                  >
                    Edit
                  </Link>

                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                    >
                      Directions →
                    </a>
                  ) : null}

                  {s.currentHut ? (
                    <Link
                      href={`/huts/${encodeURIComponent(s.currentHut.code)}`}
                      className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                    >
                      Open hut →
                    </Link>
                  ) : (
                    <div className='px-3 py-2 text-sm text-zinc-500'>
                      No hut mapped
                    </div>
                  )}
                </div>
              </div>

              {/* Accordion details */}
              <div
                id={`site-details-${s.id}`}
                className={
                  open ? 'block border-t border-zinc-800 px-5 pb-5' : 'hidden'
                }
              >
                <div className='pt-5 space-y-4'>
                  {ex ? (
                    <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='text-sm font-medium text-zinc-200'>
                          Example data
                        </div>
                        <Pill tone='neutral'>REPORT</Pill>
                      </div>
                      <div className='mt-1 text-xs text-zinc-500'>
                        {fmtDate(ex.rangeStart)} → {fmtDate(ex.rangeEnd)}
                      </div>
                    </div>
                  ) : null}

                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Last ping</div>
                    <div className='mt-1 text-sm text-zinc-200'>
                      {fmt(s.lastHeartbeat)}
                    </div>
                  </div>

                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='flex items-center justify-between'>
                      <div className='text-sm font-medium text-zinc-200'>
                        Daily gas
                      </div>
                      <div className='text-xs text-zinc-500'>
                        {dg ? dg.date : '—'}
                      </div>
                    </div>

                    <div className='mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2'>
                      <div className='rounded-lg border border-zinc-800 bg-zinc-950/40 p-2'>
                        <div className='text-[11px] text-zinc-500'>MCF</div>
                        <div className='mt-1 text-sm font-semibold text-zinc-200'>
                          {fmtNum(dg?.totals.vol_mcf ?? prod.gasMcfpd)}
                        </div>
                      </div>
                      <div className='rounded-lg border border-zinc-800 bg-zinc-950/40 p-2'>
                        <div className='text-[11px] text-zinc-500'>MMBTU</div>
                        <div className='mt-1 text-sm font-semibold text-zinc-200'>
                          {fmtNum(dg?.totals.mmbtu)}
                        </div>
                      </div>
                      <div className='rounded-lg border border-zinc-800 bg-zinc-950/40 p-2 col-span-2 sm:col-span-1'>
                        <div className='text-[11px] text-zinc-500'>
                          Flow hrs
                        </div>
                        <div className='mt-1 text-sm font-semibold text-zinc-200'>
                          {fmtNum(dg?.totals.flow_hrs)}
                        </div>
                      </div>
                    </div>

                    {dg?.meters?.[0] ? (
                      <div className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 min-w-0'>
                        <span>LP {fmtNum(dg.meters[0].lp_psi)} psi</span>
                        <span className='text-zinc-700'>•</span>
                        <span>DP {fmtNum(dg.meters[0].dp_inh2o)} inH2O</span>
                        <span className='text-zinc-700'>•</span>
                        <span>Temp {fmtNum(dg.meters[0].temp_f)} °F</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
