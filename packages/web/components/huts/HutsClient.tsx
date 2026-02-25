'use client'

import type { HutDto } from '@ops/shared'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { HutList } from './HutList'

const buildHref = (q: string) => {
  const qp = new URLSearchParams()
  if (q.trim()) qp.set('q', q.trim())
  const qs = qp.toString()
  return qs ? `/huts?${qs}` : '/huts'
}

export const HutsClient = ({
  huts,
  initialQ
}: {
  huts: HutDto[]
  initialQ: string
}) => {
  const [q, setQ] = useState(initialQ)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // If user navigates back/forward and URL q changes, keep input synced
  useEffect(() => {
    const next = (searchParams.get('q') ?? '').toString()
    setQ(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Debounced URL sync so typing doesn’t spam navigation
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(buildHref(q), { scroll: false })
    }, 150)

    return () => clearTimeout(t)
  }, [q, router, pathname])

  const assignedCount = useMemo(
    () => huts.filter((h) => Boolean(h.currentSite?.id)).length,
    [huts]
  )
  const unassignedCount = huts.length - assignedCount

  return (
    <div className='space-y-4'>
      {/* Toolbar */}
      <div className='rounded-2xl border border-zinc-800 bg-zinc-950/20 p-3 sm:p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
          <div className='w-full lg:w-[520px]'>
            <label className='sr-only' htmlFor='hut-search'>
              Search huts
            </label>
            <div className='flex w-full items-center gap-2'>
              <input
                id='hut-search'
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search huts (code, name, site)…'
                className='w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
              />
              <button
                type='button'
                onClick={() => setQ('')}
                className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/40'
              >
                Clear
              </button>
            </div>

            <div className='mt-2 text-sm text-zinc-500'>
              Total <span className='text-zinc-300'>{huts.length}</span> •{' '}
              <span className='text-zinc-300'>{assignedCount}</span> assigned •{' '}
              <span className='text-zinc-300'>{unassignedCount}</span>{' '}
              unassigned
            </div>
          </div>
        </div>
      </div>

      {/* List filters instantly based on q */}
      <HutList huts={huts} q={q} />
    </div>
  )
}
