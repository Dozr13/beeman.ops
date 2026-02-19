import {
  getSiteLatLng,
  googleMapsDirectionsUrl,
  HutDto,
  isOnline,
  SiteDto
} from '@ops/shared'
import Link from 'next/link'
import { apiGet } from '../../components/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../components/ui'

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

const fmtNum = (n: unknown) => {
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return '—'
  return Intl.NumberFormat().format(num)
}

const getProduction = (meta: any) => {
  const p = meta?.production ?? meta?.prod ?? null
  return {
    oilBopd: p?.oilBopd ?? p?.oil ?? null,
    waterBwpd: p?.waterBwpd ?? p?.water ?? null,
    gasMcfpd: p?.gasMcfpd ?? p?.gas ?? null
  }
}

// ----------------------------
// Sorting (FULL implementation)
// ----------------------------
type SortKey = 'status' | 'name'
type SortDir = 'asc' | 'desc'

const normalizeName = (name: string | null | undefined, code: string) =>
  (name ?? code).trim().toLowerCase()

const parseSort = (
  searchParams: Record<string, string | string[] | undefined>
) => {
  const rawSort = searchParams.sort
  const rawDir = searchParams.dir

  const sort =
    (Array.isArray(rawSort) ? rawSort[0] : rawSort) === 'name'
      ? 'name'
      : 'status'

  const dir =
    (Array.isArray(rawDir) ? rawDir[0] : rawDir) === 'desc' ? 'desc' : 'asc'

  return { sort, dir } as { sort: SortKey; dir: SortDir }
}

const compareSites = (a: SiteDto, b: SiteDto, sort: SortKey, dir: SortDir) => {
  const mult = dir === 'asc' ? 1 : -1

  if (sort === 'status') {
    // Online FIRST, always (rank 0 is best)
    const aRank = isOnline(a.lastHeartbeat) ? 0 : 1
    const bRank = isOnline(b.lastHeartbeat) ? 0 : 1
    if (aRank !== bRank) return (aRank - bRank) * mult
  }

  const an = normalizeName(a.name, a.code)
  const bn = normalizeName(b.name, b.code)
  if (an < bn) return -1 * mult
  if (an > bn) return 1 * mult
  return a.code.localeCompare(b.code) * mult
}

const buildSortHref = (sort: SortKey, dir: SortDir) =>
  `/sites?sort=${sort}&dir=${dir}`

export default async function SitesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}

  const [sites, huts] = await Promise.all([
    apiGet<SiteDto[]>('/v1/sites'),
    apiGet<HutDto[]>('/v1/huts')
  ])

  const { sort, dir } = parseSort(sp)
  const sortedSites = [...sites].sort((a, b) => compareSites(a, b, sort, dir))

  const onlineCount = sites.filter((s) => isOnline(s.lastHeartbeat)).length
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
    <div className='px-6 py-6 md:px-10'>
      <div className='mx-auto w-full max-w-7xl space-y-6'>
        {/* Header */}
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div className='space-y-2'>
            <h1 className='text-3xl font-semibold tracking-tight'>Sites</h1>
            <p className='text-sm text-zinc-400'>
              Site monitoring (ping + devices). Huts are tracked separately and
              can be assigned to a site.
            </p>
            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Pill tone='neutral'>LIVE</Pill>
              <span className='text-xs text-zinc-500'>
                Online = ping within 3 minutes
              </span>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Link
              href='/sites/new'
              className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
            >
              New site
            </Link>
          </div>
        </div>

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
              <div className='mt-2 text-xs text-zinc-500'>
                From pings/ingest
              </div>
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

        <div className='flex flex-wrap gap-2 text-xs text-zinc-500'>
          <Pill tone='neutral'>WELL: {wellCount}</Pill>
          <Pill tone='neutral'>PAD: {padCount}</Pill>
          <Pill tone='neutral'>FACILITY: {facilityCount}</Pill>
          <Pill tone='neutral'>YARD: {yardCount}</Pill>
          <Pill tone='neutral'>UNKNOWN: {unknownCount}</Pill>
        </div>

        {/* Sort controls */}
        <div className='flex flex-wrap items-center gap-2'>
          <div className='text-sm text-zinc-400'>Sort:</div>

          <Link
            href={buildSortHref('status', sort === 'status' ? dir : 'asc')}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              sort === 'status'
                ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200'
                : 'border-zinc-800 hover:bg-zinc-900/40'
            }`}
          >
            Status
          </Link>

          <Link
            href={buildSortHref('name', sort === 'name' ? dir : 'asc')}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              sort === 'name'
                ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200'
                : 'border-zinc-800 hover:bg-zinc-900/40'
            }`}
          >
            Name
          </Link>

          <Link
            href={buildSortHref(sort, dir === 'asc' ? 'desc' : 'asc')}
            className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
          >
            {dir.toUpperCase()}
          </Link>
        </div>

        {/* Sites grid */}
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {sortedSites.map((s) => {
            const online = isOnline(s.lastHeartbeat)
            const prod = getProduction(s.meta)
            const ll = getSiteLatLng(s)
            const directionsUrl = ll ? googleMapsDirectionsUrl(ll) : null

            return (
              <Card
                key={s.id}
                className='relative border-zinc-800 bg-zinc-950/20 transition hover:border-zinc-700 hover:bg-zinc-900/20'
              >
                {/* Clickable overlay (SAFE now because Card is relative) */}
                <Link
                  href={`/sites/${s.id}`}
                  aria-label={`Open site ${s.name ?? s.code}`}
                  className='absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40'
                />

                {/* Content sits above overlay but does NOT steal clicks */}
                <div className='relative z-10 pointer-events-none'>
                  <CardHeader className='flex flex-row items-start gap-4'>
                    <div className='min-w-full'>
                      <div className='flex justify-between'>
                        <CardTitle className='truncate'>
                          {s.name ?? s.code}
                        </CardTitle>
                        <div className='flex items-end gap-2'>
                          <Pill tone={online ? 'good' : 'bad'}>
                            {online ? 'ONLINE' : 'OFFLINE'}
                          </Pill>

                          {s.currentHut ? (
                            <Pill tone='neutral'>HUT: {s.currentHut.code}</Pill>
                          ) : (
                            <Pill tone='neutral'>NO HUT</Pill>
                          )}
                        </div>
                      </div>
                      <div className='mt-1 text-xs text-zinc-400'>
                        <span className='text-zinc-300'>{s.code}</span>
                        <span className='mx-2 text-zinc-700'>•</span>
                        <span>{s.type ?? 'UNKNOWN'}</span>
                        <span className='mx-2 text-zinc-700'>•</span>
                        <span>{s.timezone ?? 'n/a'}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className='space-y-4'>
                    <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                      <div className='text-xs text-zinc-500'>Last ping</div>
                      <div className='mt-1 text-sm text-zinc-200'>
                        {fmt(s.lastHeartbeat)}
                      </div>
                    </div>

                    <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='text-sm font-medium text-zinc-200'>
                          Production
                        </div>
                        <div className='text-xs text-zinc-500'>
                          placeholder-ready
                        </div>
                      </div>

                      <div className='mt-3 grid grid-cols-3 gap-2'>
                        <div className='rounded-lg border border-zinc-800 bg-zinc-950/40 p-2'>
                          <div className='text-[11px] text-zinc-500'>Oil</div>
                          <div className='mt-1 text-sm font-semibold text-zinc-200'>
                            {fmtNum(prod.oilBopd)}{' '}
                            <span className='text-xs text-zinc-500'>BOPD</span>
                          </div>
                        </div>
                        <div className='rounded-lg border border-zinc-800 bg-zinc-950/40 p-2'>
                          <div className='text-[11px] text-zinc-500'>Water</div>
                          <div className='mt-1 text-sm font-semibold text-zinc-200'>
                            {fmtNum(prod.waterBwpd)}{' '}
                            <span className='text-xs text-zinc-500'>BWPD</span>
                          </div>
                        </div>
                        <div className='rounded-lg border border-zinc-800 bg-zinc-950/40 p-2'>
                          <div className='text-[11px] text-zinc-500'>Gas</div>
                          <div className='mt-1 text-sm font-semibold text-zinc-200'>
                            {fmtNum(prod.gasMcfpd)}{' '}
                            <span className='text-xs text-zinc-500'>MCF/D</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Actions stay clickable */}
                <div className='relative z-20 px-5 pb-5 pointer-events-auto'>
                  <div className='flex flex-wrap gap-2'>
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
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
