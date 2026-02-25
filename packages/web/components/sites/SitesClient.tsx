'use client'

import type { SiteDto } from '@ops/shared'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { SortDir, SortKey } from '../../app/sites/page'
import { SiteList } from './SiteList'

const buildHref = (opts: { sort: SortKey; dir: SortDir; q: string }) => {
  const qp = new URLSearchParams()
  qp.set('sort', opts.sort)
  qp.set('dir', opts.dir)
  if (opts.q.trim()) qp.set('q', opts.q.trim())
  return `/sites?${qp.toString()}`
}

export const SitesClient = ({
  sites,
  initialQ,
  sort,
  dir
}: {
  sites: SiteDto[]
  initialQ: string
  sort: SortKey
  dir: SortDir
}) => {
  const [q, setQ] = useState(initialQ)
  const router = useRouter()
  const pathname = usePathname()

  // Debounced URL sync so typing doesn't spam history/navigation
  useEffect(() => {
    const t = setTimeout(() => {
      const href = buildHref({ sort, dir, q })
      // replace keeps it clean (no huge back button spam)
      router.replace(href)
    }, 150)

    return () => clearTimeout(t)
  }, [q, sort, dir, router, pathname])

  const sortHrefStatus = useMemo(
    () =>
      buildHref({ sort: 'status', dir: sort === 'status' ? dir : 'asc', q }),
    [sort, dir, q]
  )
  const sortHrefName = useMemo(
    () => buildHref({ sort: 'name', dir: sort === 'name' ? dir : 'asc', q }),
    [sort, dir, q]
  )
  const sortHrefDir = useMemo(
    () => buildHref({ sort, dir: dir === 'asc' ? 'desc' : 'asc', q }),
    [sort, dir, q]
  )

  return (
    <>
      {/* Toolbar */}
      <div className='rounded-2xl border border-zinc-800 bg-zinc-950/20 p-3 sm:p-4 my-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          {/* Sort */}
          <div className='flex flex-wrap items-center gap-2'>
            <div className='mr-1 text-sm text-zinc-400'>Sort:</div>

            <Link
              href={sortHrefStatus}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                sort === 'status'
                  ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200'
                  : 'border-zinc-800 hover:bg-zinc-900/40'
              }`}
            >
              Status
            </Link>

            <Link
              href={sortHrefName}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                sort === 'name'
                  ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200'
                  : 'border-zinc-800 hover:bg-zinc-900/40'
              }`}
            >
              Name
            </Link>

            <Link
              href={sortHrefDir}
              className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
            >
              {dir.toUpperCase()}
            </Link>
          </div>

          {/* Live Search */}
          <div className='w-full lg:w-[420px]'>
            <div className='flex w-full items-center gap-2'>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search sites (code, name, type, hut, timezone)…'
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
          </div>
        </div>
      </div>

      {/* Accordion list (filters inside SiteList using q) */}
      <SiteList sites={sites} q={q} />
    </>
  )
}
