import type { HutDto, SiteDto } from '@ops/shared'
import { isOnline } from '@ops/shared'
import Link from 'next/link'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageShell } from '../../components/layout/PageShell'
import { SitesClient } from '../../components/sites/SitesClient'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../components/ui'
import { apiGet } from '../../lib/api'

// ----------------------------
// Sorting
// ----------------------------
export type SortKey = 'status' | 'name'
export type SortDir = 'asc' | 'desc'

const normalizeName = (name: string | null | undefined, code: string) =>
  (name ?? code).trim().toLowerCase()

const parseSort = (
  searchParams: Record<string, string | string[] | undefined>
) => {
  const rawSort = searchParams.sort
  const rawDir = searchParams.dir

  const sort: SortKey =
    (Array.isArray(rawSort) ? rawSort[0] : rawSort) === 'name'
      ? 'name'
      : 'status'

  const dir: SortDir =
    (Array.isArray(rawDir) ? rawDir[0] : rawDir) === 'desc' ? 'desc' : 'asc'

  return { sort, dir }
}

const compareSites = (a: SiteDto, b: SiteDto, sort: SortKey, dir: SortDir) => {
  const mult = dir === 'asc' ? 1 : -1

  if (sort === 'status') {
    // Online FIRST
    const aRank = isOnline(a.lastHeartbeat ?? null) ? 0 : 1
    const bRank = isOnline(b.lastHeartbeat ?? null) ? 0 : 1
    if (aRank !== bRank) return (aRank - bRank) * mult
  }

  const an = normalizeName(a.name, a.code)
  const bn = normalizeName(b.name, b.code)
  if (an < bn) return -1 * mult
  if (an > bn) return 1 * mult
  return a.code.localeCompare(b.code) * mult
}

const parseQ = (sp: Record<string, string | string[] | undefined>) => {
  const raw = sp.q
  const q = Array.isArray(raw) ? raw[0] : raw
  return (q ?? '').toString()
}

export default async function SitesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const q = parseQ(sp)
  const { sort, dir } = parseSort(sp)

  const [sites, huts] = await Promise.all([
    apiGet<SiteDto[]>('/v1/sites'),
    apiGet<HutDto[]>('/v1/huts')
  ])

  const sortedSites = [...sites].sort((a, b) => compareSites(a, b, sort, dir))

  const onlineCount = sites.filter((s) =>
    isOnline(s.lastHeartbeat ?? null)
  ).length
  const offlineCount = sites.length - onlineCount

  const wellCount = sites.filter((s) => s.type === 'WELL').length
  const padCount = sites.filter((s) => s.type === 'PAD').length
  const facilityCount = sites.filter((s) => s.type === 'FACILITY').length
  const yardCount = sites.filter((s) => s.type === 'YARD').length
  const unknownCount = sites.filter(
    (s) => s.type === 'UNKNOWN' || !s.type
  ).length

  const hutCount = huts.length
  const assignedHutCount = huts.filter((h) => Boolean(h.currentSite?.id)).length
  const unassignedHutCount = hutCount - assignedHutCount

  return (
    <PageShell>
      <PageHeader
        title='Sites'
        subtitle='Site monitoring (ping + devices). Huts are tracked separately and can be assigned to a site.'
        actions={
          <Link
            href='/sites/new'
            className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
          >
            New site
          </Link>
        }
      />

      {/* KPI row */}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card className='border-zinc-800'>
          <CardHeader>
            <CardTitle>Total Sites</CardTitle>
            <div className='text-sm text-zinc-400'>Known sites</div>
          </CardHeader>
          <CardContent>
            <div className='text-4xl font-semibold tracking-tight'>
              {sites.length}
            </div>
            <div className='mt-2 text-xs text-zinc-500'>From pings/ingest</div>
          </CardContent>
        </Card>

        <Card className='border-zinc-800'>
          <CardHeader>
            <CardTitle>Online</CardTitle>
            <div className='text-sm text-zinc-400'>Ping fresh</div>
          </CardHeader>
          <CardContent>
            <div className='text-4xl font-semibold tracking-tight'>
              {onlineCount}
            </div>
            <div className='mt-2'>
              <Pill tone='good'>ONLINE</Pill>
            </div>
          </CardContent>
        </Card>

        <Card className='border-zinc-800'>
          <CardHeader>
            <CardTitle>Offline</CardTitle>
            <div className='text-sm text-zinc-400'>No recent ping</div>
          </CardHeader>
          <CardContent>
            <div className='text-4xl font-semibold tracking-tight'>
              {offlineCount}
            </div>
            <div className='mt-2'>
              <Pill tone='bad'>OFFLINE</Pill>
            </div>
          </CardContent>
        </Card>

        <Card className='border-zinc-800'>
          <CardHeader>
            <CardTitle>Huts</CardTitle>
            <div className='text-sm text-zinc-400'>Assigned / Unassigned</div>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-zinc-400'>
              {assignedHutCount} assigned • {unassignedHutCount} unassigned
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              <Pill tone='neutral'>HUTS: {hutCount}</Pill>
              <Pill tone='neutral'>ASSIGNED: {assignedHutCount}</Pill>
              <Pill tone='neutral'>UNASSIGNED: {unassignedHutCount}</Pill>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='flex flex-wrap gap-2 text-xs text-zinc-500 mt-4 mb-2'>
        <Pill tone='neutral'>WELL: {wellCount}</Pill>
        <Pill tone='neutral'>PAD: {padCount}</Pill>
        <Pill tone='neutral'>FACILITY: {facilityCount}</Pill>
        <Pill tone='neutral'>YARD: {yardCount}</Pill>
        <Pill tone='neutral'>UNKNOWN: {unknownCount}</Pill>
      </div>

      {/* Client wrapper: live search + toolbar + list */}
      <SitesClient sites={sortedSites} initialQ={q} sort={sort} dir={dir} />
    </PageShell>
  )
}
