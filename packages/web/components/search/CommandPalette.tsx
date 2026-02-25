'use client'

import { Command } from 'cmdk'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { Pill } from '../ui'

type SiteHit = {
  id: string
  code: string
  name: string | null
  type?: string | null
  lastHeartbeat?: string | null
  timezone?: string | null
  currentHut?: { code: string } | null
}

type HutHit = {
  id: string
  code: string
  name?: string | null
  currentSite?: { id: string; code: string } | null
}

type Props = {
  getSites: () => Promise<SiteHit[]>
  getHuts: () => Promise<HutHit[]>
}

const normalize = (s: string) => s.trim().toLowerCase()

export const CommandPalette = ({ getSites, getHuts }: Props) => {
  const router = useRouter()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sites, setSites] = useState<SiteHit[] | null>(null)
  const [huts, setHuts] = useState<HutHit[] | null>(null)

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k'
      if (!isK) return
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close on route change
  useEffect(() => {
    setOpen(false)
    setQ('')
  }, [pathname])

  // Lazy load data on first open
  useEffect(() => {
    if (!open) return
    ;(async () => {
      if (!sites) setSites(await getSites())
      if (!huts) setHuts(await getHuts())
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const { siteHits, hutHits } = useMemo(() => {
    const query = normalize(q)
    const scoped = query.startsWith('site:') || query.startsWith('hut:')
    const scope = scoped ? query.split(':')[0] : null
    const raw = scoped ? query.slice(query.indexOf(':') + 1).trim() : query

    const match = (hay: string) => normalize(hay).includes(raw)

    const siteHits =
      sites && (scope === null || scope === 'site')
        ? sites
            .filter((s) =>
              raw ? match(`${s.code} ${s.name ?? ''} ${s.type ?? ''}`) : true
            )
            .slice(0, 12)
        : []

    const hutHits =
      huts && (scope === null || scope === 'hut')
        ? huts
            .filter((h) =>
              raw
                ? match(
                    `${h.code} ${h.name ?? ''} ${h.currentSite?.code ?? ''}`
                  )
                : true
            )
            .slice(0, 12)
        : []

    return { siteHits, hutHits }
  }, [q, sites, huts])

  const go = (href: string) => {
    setOpen(false)
    setQ('')
    router.push(href)
  }

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50'>
      <div
        className='absolute inset-0 bg-black/60'
        onClick={() => setOpen(false)}
      />

      <div className='absolute left-1/2 top-[10%] w-[92vw] max-w-2xl -translate-x-1/2'>
        <div className='rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl'>
          <Command className='p-2'>
            <div className='px-2 pt-2'>
              <div className='flex items-center justify-between'>
                <div className='text-sm font-medium text-zinc-200'>
                  Jump to…
                </div>
                <div className='text-xs text-zinc-500'>
                  Tip: “site: bulldog” or “hut: GH”
                </div>
              </div>

              <Command.Input
                autoFocus
                value={q}
                onValueChange={setQ}
                placeholder='Search sites and huts…'
                className='mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600'
              />
            </div>

            <Command.List className='mt-2 max-h-[60vh] overflow-auto px-2 pb-2'>
              {sites === null || huts === null ? (
                <div className='px-2 py-6 text-sm text-zinc-500'>Loading…</div>
              ) : null}

              {siteHits.length ? (
                <Command.Group heading='Sites' className='mt-2'>
                  {siteHits.map((s) => (
                    <Command.Item
                      key={s.id}
                      value={`${s.code} ${s.name ?? ''}`}
                      onSelect={() => go(`/sites/${s.id}`)}
                      className='flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 aria-selected:bg-zinc-900/50'
                    >
                      <div className='min-w-0'>
                        <div className='truncate font-medium'>
                          {s.name ?? s.code}
                        </div>
                        <div className='mt-0.5 truncate text-xs text-zinc-500'>
                          {s.code} • {s.type ?? 'UNKNOWN'} •{' '}
                          {s.timezone ?? 'n/a'}
                        </div>
                      </div>
                      <div className='shrink-0 flex items-center gap-2'>
                        {s.currentHut ? (
                          <Pill tone='neutral'>HUT {s.currentHut.code}</Pill>
                        ) : null}
                        <Pill tone='neutral'>SITE</Pill>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {hutHits.length ? (
                <Command.Group heading='Huts' className='mt-2'>
                  {hutHits.map((h) => (
                    <Command.Item
                      key={h.id}
                      value={`${h.code} ${h.name ?? ''}`}
                      onSelect={() => go(`/huts/${encodeURIComponent(h.code)}`)}
                      className='flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 aria-selected:bg-zinc-900/50'
                    >
                      <div className='min-w-0'>
                        <div className='truncate font-medium'>{h.code}</div>
                        <div className='mt-0.5 truncate text-xs text-zinc-500'>
                          {h.currentSite
                            ? `Assigned to ${h.currentSite.code}`
                            : 'Unassigned'}
                        </div>
                      </div>
                      <div className='shrink-0 flex items-center gap-2'>
                        {h.currentSite ? (
                          <Pill tone='neutral'>SITE {h.currentSite.code}</Pill>
                        ) : null}
                        <Pill tone='neutral'>HUT</Pill>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {!siteHits.length && !hutHits.length && sites && huts ? (
                <div className='px-2 py-6 text-sm text-zinc-500'>
                  No matches.
                </div>
              ) : null}
            </Command.List>

            <div className='flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500'>
              <div>Esc to close</div>
              <Link
                href='/sites'
                className='hover:text-zinc-300'
                onClick={() => setOpen(false)}
              >
                Browse sites
              </Link>
            </div>
          </Command>
        </div>
      </div>
    </div>
  )
}
