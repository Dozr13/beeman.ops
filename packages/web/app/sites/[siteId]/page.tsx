import { isOnline, SiteDto } from '@ops/shared'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../../components/ui'
import { apiGet } from '../../../lib/api'

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

const fmtNum = (n: unknown) => {
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return '—'
  return Intl.NumberFormat().format(num)
}

export default async function SitePage({
  params
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const site = await apiGet<SiteDto>(`/v1/sites/${siteId}`)

  const pingOnline = isOnline(site.lastHeartbeat)
  const hutPingOnline = site.currentHut?.lastHeartbeat
    ? isOnline(site.currentHut.lastHeartbeat)
    : null

  const ex = site.exampleData ?? null
  const dg = site.dailyGas ?? null

  return (
    <div className='px-6 py-6 md:px-10'>
      <div className='mx-auto w-full max-w-4xl space-y-6'>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-3xl font-semibold tracking-tight'>
              {site.name ?? site.code}
            </h1>

            {ex ? <Pill tone='neutral'>EXAMPLE REPORT</Pill> : null}

            {/* Ping health pill */}
            <Pill tone={pingOnline ? 'good' : 'bad'}>
              PING {pingOnline ? 'OK' : 'DOWN'}
            </Pill>
          </div>

          <div className='text-sm text-zinc-400'>
            <span className='text-zinc-200'>{site.code}</span>
            <span className='mx-2 text-zinc-700'>•</span>
            <span>{site.type ?? 'UNKNOWN'}</span>
            <span className='mx-2 text-zinc-700'>•</span>
            <span>{site.timezone ?? 'n/a'}</span>
          </div>

          <div className='text-xs text-zinc-500'>Last ping: {fmt(site.lastHeartbeat)}</div>

          {ex ? (
            <div className='text-xs text-zinc-500'>
              Example data range: {ex.rangeStart} → {ex.rangeEnd}
              {ex.sourceFile ? ` • ${ex.sourceFile}` : ''}
            </div>
          ) : null}
        </div>

        <Card className='border-zinc-800 bg-zinc-950/20'>
          <CardHeader>
            <CardTitle>Daily gas (latest)</CardTitle>
            <div className='text-sm text-zinc-400'>
              Pulled from imported Weatherford/FMS XLSX metrics. Live telemetry
              will replace this once RTU polling is wired.
            </div>
          </CardHeader>
          <CardContent>
            {dg ? (
              <div className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Pill tone='neutral'>DATE: {dg.date}</Pill>
                  <div className='text-xs text-zinc-500'>Captured: {fmt(dg.ts)}</div>
                </div>

                <div className='grid gap-3 md:grid-cols-3'>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Total MCF</div>
                    <div className='mt-1 text-2xl font-semibold text-zinc-100'>
                      {fmtNum(dg.totals.vol_mcf)}
                    </div>
                  </div>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Total MMBTU</div>
                    <div className='mt-1 text-2xl font-semibold text-zinc-100'>
                      {fmtNum(dg.totals.mmbtu)}
                    </div>
                  </div>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Total Flow hrs</div>
                    <div className='mt-1 text-2xl font-semibold text-zinc-100'>
                      {fmtNum(dg.totals.flow_hrs)}
                    </div>
                  </div>
                </div>

                <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                  <div className='text-sm font-medium text-zinc-200'>Meters</div>
                  <div className='mt-2 space-y-2'>
                    {dg.meters.map((m) => (
                      <div
                        key={m.deviceId}
                        className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2'
                      >
                        <div className='text-sm text-zinc-200'>
                          Meter {m.externalId}
                        </div>
                        <div className='text-xs text-zinc-500'>
                          LP {fmtNum(m.lp_psi)} psi • DP {fmtNum(m.dp_inh2o)} inH2O • Temp {fmtNum(m.temp_f)} °F
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className='text-sm text-zinc-500'>No daily gas metrics found for this site yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className='border-zinc-800 bg-zinc-950/20'>
          <CardHeader>
            <CardTitle>Assigned hut</CardTitle>
            <div className='text-sm text-zinc-400'>
              HashHuts are mobile containers with miners/routers and their own
              status.
            </div>
          </CardHeader>

          <CardContent>
            {site.currentHut ? (
              <div className='flex flex-col gap-3'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-lg font-semibold text-zinc-100'>
                        {site.currentHut.code}
                      </div>

                      {hutPingOnline != null ? (
                        <Pill tone={hutPingOnline ? 'good' : 'bad'}>
                          PING {hutPingOnline ? 'OK' : 'DOWN'}
                        </Pill>
                      ) : null}
                    </div>

                    <div className='text-sm text-zinc-400'>
                      {site.currentHut.name ?? '—'}
                    </div>
                  </div>

                  <Link
                    href={`/huts/${encodeURIComponent(site.currentHut.code)}`}
                    className='shrink-0 rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                  >
                    Open hut →
                  </Link>
                </div>
              </div>
            ) : (
              <div className='text-sm text-zinc-500'>
                No hut assigned to this site.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
