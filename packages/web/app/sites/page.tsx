import { getSiteLatLng, googleMapsDirectionsUrl, isOnline } from '@ops/shared'
import Link from 'next/link'
import { apiGet } from '../../components/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../components/ui'

type SiteType = 'UNKNOWN' | 'WELL' | 'PAD' | 'FACILITY' | 'YARD'

type Site = {
  id: string
  code: string
  name: string | null
  type: SiteType | null
  timezone: string | null
  meta: any
  createdAt: string
  lastHeartbeat: string | null
  currentHut?: { id: string; code: string; name: string | null } | null
}

type Hut = {
  id: string
  code: string
  name: string | null
  currentSite?: { id: string; code: string; name: string | null } | null
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

const fmtNum = (n: unknown) => {
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return '—'
  return Intl.NumberFormat().format(num)
}

// Pull production data from site.meta in a future-proof way.
// Later you can wire ingest to set:
// site.meta = { production: { oilBopd, waterBwpd, gasMcfpd } }
const getProduction = (meta: any) => {
  const p = meta?.production ?? meta?.prod ?? null
  return {
    oilBopd: p?.oilBopd ?? p?.oil ?? null,
    waterBwpd: p?.waterBwpd ?? p?.water ?? null,
    gasMcfpd: p?.gasMcfpd ?? p?.gas ?? null
  }
}

export default async function SitesPage() {
  const [sites, huts] = await Promise.all([
    apiGet<Site[]>('/v1/sites'),
    apiGet<Hut[]>('/v1/huts')
  ])

  const onlineCount = sites.filter((s) => isOnline(s.lastHeartbeat)).length
  const offlineCount = sites.length - onlineCount

  // Site location kinds
  const wellCount = sites.filter((s) => s.type === 'WELL').length
  const padCount = sites.filter((s) => s.type === 'PAD').length
  const facilityCount = sites.filter((s) => s.type === 'FACILITY').length
  const yardCount = sites.filter((s) => s.type === 'YARD').length
  const unknownCount = sites.filter(
    (s) => s.type === 'UNKNOWN' || !s.type
  ).length

  // Huts are separate entities now
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
              Site monitoring (heartbeat + devices). Huts are tracked separately
              and can be assigned to a site.
            </p>
            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Pill tone='neutral'>LIVE</Pill>
              <span className='text-xs text-zinc-500'>
                Online = heartbeat within 3 minutes
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
                From heartbeats/ingest
              </div>
            </CardContent>
          </Card>

          <Card className='border-zinc-800'>
            <CardHeader>
              <CardTitle>Online</CardTitle>
              <div className='text-sm text-zinc-400'>Heartbeat fresh</div>
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
              <div className='text-sm text-zinc-400'>No recent heartbeat</div>
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

        {/* Location kind counts */}
        <div className='flex flex-wrap gap-2 text-xs text-zinc-500'>
          <Pill tone='neutral'>WELL: {wellCount}</Pill>
          <Pill tone='neutral'>PAD: {padCount}</Pill>
          <Pill tone='neutral'>FACILITY: {facilityCount}</Pill>
          <Pill tone='neutral'>YARD: {yardCount}</Pill>
          <Pill tone='neutral'>UNKNOWN: {unknownCount}</Pill>
        </div>

        {/* List header */}
        <div className='flex items-center justify-between'>
          <div className='text-sm text-zinc-400'>
            Click <span className='text-zinc-200'>View</span> for site details.
          </div>
        </div>

        {/* Sites grid */}
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {sites.map((s) => {
            const online = isOnline(s.lastHeartbeat)
            const prod = getProduction(s.meta)
            const ll = getSiteLatLng(s)
            const directionsUrl = ll ? googleMapsDirectionsUrl(ll) : null

            return (
              <Card
                key={s.id}
                className='border-zinc-800 bg-zinc-950/20 transition hover:border-zinc-700 hover:bg-zinc-900/20'
              >
                <CardHeader className='flex flex-row items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <CardTitle className='truncate'>
                      {s.name ?? s.code}
                    </CardTitle>
                    <div className='mt-1 text-xs text-zinc-400'>
                      <span className='text-zinc-300'>{s.code}</span>
                      <span className='mx-2 text-zinc-700'>•</span>
                      <span>{s.type ?? 'UNKNOWN'}</span>
                      <span className='mx-2 text-zinc-700'>•</span>
                      <span>{s.timezone ?? 'n/a'}</span>
                    </div>
                  </div>

                  <div className='flex flex-col items-end gap-2'>
                    <Pill tone={online ? 'good' : 'bad'}>
                      {online ? 'ONLINE' : 'OFFLINE'}
                    </Pill>

                    {s.currentHut ? (
                      <Pill tone='neutral'>HUT: {s.currentHut.code}</Pill>
                    ) : (
                      <Pill tone='neutral'>NO HUT</Pill>
                    )}
                  </div>
                </CardHeader>

                <CardContent className='space-y-4'>
                  {/* Heartbeat */}
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Last heartbeat</div>
                    <div className='mt-1 text-sm text-zinc-200'>
                      {fmt(s.lastHeartbeat)}
                    </div>
                  </div>

                  {/* Production */}
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

                  {/* Actions */}
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
