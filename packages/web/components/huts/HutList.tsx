'use client'

import type { HutDto } from '@ops/shared'
import { isOnline } from '@ops/shared'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, Pill } from '../ui'

const normalize = (v: string) => v.trim().toLowerCase()

const matches = (q: string, h: HutDto) => {
  const qq = normalize(q)
  if (!qq) return true

  const code = normalize(h.code ?? '')
  const name = normalize(h.name ?? '')
  const siteCode = normalize(h.currentSite?.code ?? '')
  const siteName = normalize(h.currentSite?.name ?? '')

  return (
    code.includes(qq) ||
    name.includes(qq) ||
    siteCode.includes(qq) ||
    siteName.includes(qq)
  )
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

export const HutList = ({ huts, q }: { huts: HutDto[]; q: string }) => {
  const filtered = useMemo(() => huts.filter((h) => matches(q, h)), [huts, q])

  const [openAll, setOpenAll] = useState(false)
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  const isOpen = (id: string) => (openAll ? true : Boolean(openIds[id]))
  const toggleOne = (id: string) => setOpenIds((p) => ({ ...p, [id]: !p[id] }))
  const toggleAll = () => setOpenAll((v) => !v)

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-sm text-zinc-500'>
          Showing <span className='text-zinc-300'>{filtered.length}</span> of{' '}
          <span className='text-zinc-300'>{huts.length}</span>
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
        {filtered.map((h) => {
          const open = isOpen(h.id)
          const online = isOnline(h.lastHeartbeat ?? null)

          return (
            <Card
              key={h.id}
              className='border-zinc-800 bg-zinc-950/20 transition hover:border-zinc-700 hover:bg-zinc-900/20'
            >
              <div className='px-5 pt-5 pb-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <Link
                      href={`/huts/${encodeURIComponent(h.code)}`}
                      className='block truncate text-base font-semibold tracking-tight hover:underline'
                    >
                      {h.code}
                    </Link>

                    <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400'>
                      {h.name ? <span>{h.name}</span> : null}
                      {h.name ? <span className='text-zinc-700'>•</span> : null}
                      <span className='text-zinc-500'>ID {h.id}</span>

                      {h.currentSite ? (
                        <>
                          <span className='text-zinc-700'>•</span>
                          <span>Site {h.currentSite.code}</span>
                        </>
                      ) : (
                        <>
                          <span className='text-zinc-700'>•</span>
                          <span>Unassigned</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className='shrink-0 flex items-center gap-2'>
                    <Pill tone={online ? 'good' : 'bad'}>
                      {online ? 'ONLINE' : 'OFFLINE'}
                    </Pill>

                    <button
                      type='button'
                      onClick={() => toggleOne(h.id)}
                      className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/40'
                      aria-expanded={open}
                      aria-controls={`hut-details-${h.id}`}
                    >
                      {open ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                <div className='mt-4 grid grid-cols-2 gap-2'>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-[11px] text-zinc-500'>Assigned</div>
                    <div className='mt-1 truncate text-sm font-semibold text-zinc-200'>
                      {h.currentSite ? h.currentSite.code : 'No site'}
                    </div>
                  </div>

                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-[11px] text-zinc-500'>Last ping</div>
                    <div className='mt-1 truncate text-sm font-semibold text-zinc-200'>
                      {h.lastHeartbeat
                        ? new Date(h.lastHeartbeat).toLocaleDateString()
                        : '—'}
                    </div>
                  </div>
                </div>

                <div className='mt-4 flex flex-wrap gap-2'>
                  <Link
                    href={`/huts/${encodeURIComponent(h.code)}`}
                    className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                  >
                    View
                  </Link>

                  {h.currentSite ? (
                    <Link
                      href={`/sites/${h.currentSite.id}`}
                      className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                    >
                      Open site →
                    </Link>
                  ) : null}
                </div>
              </div>

              <div
                id={`hut-details-${h.id}`}
                className={
                  open ? 'block border-t border-zinc-800 px-5 pb-5' : 'hidden'
                }
              >
                <div className='pt-5 space-y-4'>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Last ping</div>
                    <div className='mt-1 text-sm text-zinc-200'>
                      {fmt(h.lastHeartbeat ?? null)}
                    </div>
                  </div>

                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Notes</div>
                    <div className='mt-1 text-sm text-zinc-200'>
                      {(h as any)?.meta?.notes ?? '—'}
                    </div>
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
