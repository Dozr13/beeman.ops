'use client'

import type { HutDto, SiteDto } from '@ops/shared'
import { Command } from 'cmdk'
import Link from 'next/link'
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'

type SearchData = {
  sites: SiteDto[]
  huts: HutDto[]
}

type Ctx = {
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandPaletteContext = createContext<Ctx | null>(null)

export const useCommandPalette = () => {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx)
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  return ctx
}

const useHotkeys = (onOpen: () => void, onClose: () => void) => {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k'
      const meta = e.metaKey || e.ctrlKey
      if (meta && isK) {
        e.preventDefault()
        onOpen()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onOpen, onClose])
}

const normalize = (v: string) => v.trim().toLowerCase()

const scoreMatch = (q: string, label: string) => {
  // tiny, deterministic matching score
  const qq = normalize(q)
  const ll = normalize(label)
  if (qq.length === 0) return 0
  if (ll === qq) return 10_000
  if (ll.startsWith(qq)) return 2_000
  if (ll.includes(qq)) return 1_000
  // subsequence match
  let qi = 0
  for (let i = 0; i < ll.length && qi < qq.length; i++) {
    if (ll[i] === qq[qi]) qi++
  }
  return qi === qq.length ? 100 : 0
}

export const CommandPaletteProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const fetchedOnce = useRef(false)

  const close = useCallback(() => {
    setIsOpen(false)
    setQ('')
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((v) => !v)
  }, [])

  useHotkeys(open, close)

  React.useEffect(() => {
    if (!isOpen) return
    if (fetchedOnce.current) return
    fetchedOnce.current = true
    setLoading(true)
    fetch('/api/search-data')
      .then((r) => r.json())
      .then((json) => setData(json as SearchData))
      .finally(() => setLoading(false))
  }, [isOpen])

  const ctx = useMemo<Ctx>(() => ({ open, close, toggle }), [open, close, toggle])

  const items = useMemo(() => {
    const sites = (data?.sites ?? []).map((s) => ({
      kind: 'site' as const,
      id: s.id,
      label: `${s.name ?? s.code}`,
      hint: `${s.code}${s.type ? ` • ${s.type}` : ''}`,
      href: `/sites/${s.id}`
    }))

    const huts = (data?.huts ?? []).map((h) => ({
      kind: 'hut' as const,
      id: h.id,
      label: `${h.code}${h.name ? ` • ${h.name}` : ''}`,
      hint: h.currentSite ? `Site: ${h.currentSite.code}` : 'Unassigned',
      href: `/huts/${encodeURIComponent(h.code)}`
    }))

    const all = [...sites, ...huts]
    if (!q.trim()) return all

    return all
      .map((it) => ({ it, score: scoreMatch(q, `${it.label} ${it.hint}`) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.it)
  }, [data, q])

  return (
    <CommandPaletteContext.Provider value={ctx}>
      {children}

      {isOpen ? (
        <div
          className='fixed inset-0 z-50'
          role='dialog'
          aria-modal='true'
          aria-label='Quick search'
        >
          <div
            className='absolute inset-0 bg-black/70 backdrop-blur-sm'
            onClick={close}
          />

          <div className='absolute left-1/2 top-20 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2'>
            <div className='overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl'>
              <Command
                className='w-full'
                shouldFilter={false}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    close()
                  }
                }}
              >
                <div className='flex items-center gap-2 border-b border-zinc-800 px-4 py-3'>
                  <span className='text-xs font-medium text-zinc-400'>⌘K</span>
                  <Command.Input
                    value={q}
                    onValueChange={setQ}
                    autoFocus
                    placeholder='Search sites and huts…'
                    className='w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none'
                  />
                </div>

                <Command.List className='max-h-[60vh] overflow-y-auto p-2'>
                  {loading ? (
                    <div className='px-3 py-2 text-sm text-zinc-400'>Loading…</div>
                  ) : null}

                  {!loading && items.length === 0 ? (
                    <div className='px-3 py-2 text-sm text-zinc-400'>No matches.</div>
                  ) : null}

                  {items.map((it) => (
                    <Command.Item
                      key={`${it.kind}:${it.id}`}
                      value={`${it.kind}:${it.label}`}
                      onSelect={() => close()}
                      className='rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none data-[selected=true]:bg-zinc-900'
                    >
                      <Link
                        href={it.href}
                        className='flex w-full items-center justify-between gap-3'
                      >
                        <div className='min-w-0'>
                          <div className='truncate font-medium'>{it.label}</div>
                          <div className='mt-0.5 truncate text-xs text-zinc-500'>{it.hint}</div>
                        </div>
                        <div className='shrink-0 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-400'>
                          {it.kind.toUpperCase()}
                        </div>
                      </Link>
                    </Command.Item>
                  ))}
                </Command.List>
              </Command>

              <div className='border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500'>
                Tip: ⌘K / Ctrl-K opens search. Esc closes.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </CommandPaletteContext.Provider>
  )
}
