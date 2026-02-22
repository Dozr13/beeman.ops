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

  return (
    <div className='px-6 py-6 md:px-10'>
      <div className='mx-auto w-full max-w-4xl space-y-6'>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-3xl font-semibold tracking-tight'>
              {site.name ?? site.code}
            </h1>

            {/* SITE pill = coming soon */}
            <Pill tone='neutral'>COMING SOON</Pill>

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

          <div className='text-xs text-zinc-500'>
            Last ping: {fmt(site.lastHeartbeat)}
          </div>
        </div>

        <Card className='border-zinc-800 bg-zinc-950/20'>
          <CardHeader>
            <CardTitle>Work in progress</CardTitle>
            <div className='text-sm text-zinc-400'>
              This page will track equipment and production data for this
              location. For now, if a hut is assigned you can see that here.
            </div>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-zinc-300'>
            <div>Planned additions:</div>
            <ul className='list-disc space-y-1 pl-5 text-zinc-400'>
              <li>Equipment tracking (Loaders, Heaters, Trailers, etc.)</li>
              <li>Pressures and temperatures (where available)</li>
              <li>Volumes / totals by location configuration</li>
              <li>Operational alerts and trends</li>
            </ul>
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
