import { isOnline } from '@ops/shared'
import Link from 'next/link'
import { apiGet } from '../../../components/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../../components/ui'

type Site = {
  id: string
  code: string
  name: string | null
  type: string | null
  timezone: string
  meta: any
  createdAt: string
  lastHeartbeat: string | null
  currentHut: { id: string; code: string; name: string | null } | null
}

type Device = {
  id: string
  siteId: string
  externalId: string
  kind: string
  name: string | null
  meta: any
  createdAt: string
}

type Props = {
  params: Promise<{ siteId: string }>
}

export default async function SiteDetailPage({ params }: Props) {
  const { siteId } = await params

  const site = await apiGet<Site>(`/v1/sites/${siteId}`)
  const devices = await apiGet<Device[]>(`/v1/sites/${siteId}/devices`)

  const online = isOnline(site.lastHeartbeat)
  const hutCode = site.currentHut?.code ?? null

  return (
    <div className='mx-auto w-full max-w-5xl space-y-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-3'>
            <h1 className='text-2xl font-semibold tracking-tight'>
              {site.name ?? site.code}
            </h1>
            <Pill tone={online ? 'good' : 'bad'}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </Pill>
          </div>

          <div className='mt-1 text-sm text-zinc-400'>
            {site.type ?? 'UNKNOWN'} • {site.timezone}
          </div>

          <div className='mt-2 text-xs text-zinc-500'>
            Last heartbeat:{' '}
            {site.lastHeartbeat
              ? new Date(site.lastHeartbeat).toLocaleString()
              : 'never'}
          </div>
        </div>

        <div className='flex flex-wrap gap-2 md:justify-end'>
          <Link
            href={`/sites/${siteId}/edit`}
            className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium transition hover:bg-zinc-900/50 hover:border-zinc-700'
          >
            Edit Site →
          </Link>

          {hutCode ? (
            <Link
              href={`/huts/${encodeURIComponent(hutCode)}`}
              className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium transition hover:bg-zinc-900/50 hover:border-zinc-700'
            >
              Open Hut Dashboard →
            </Link>
          ) : (
            <div className='flex items-center rounded-xl border border-zinc-900 bg-zinc-950/20 px-3 py-2 text-xs text-zinc-500'>
              No hut assigned
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
          <div className='text-sm text-zinc-400'>
            Devices currently known for this site.
          </div>
        </CardHeader>

        <CardContent>
          {devices.length === 0 ? (
            <div className='rounded-xl border border-zinc-900 bg-zinc-950/20 p-4 text-sm text-zinc-400'>
              No devices yet.
            </div>
          ) : (
            <div className='space-y-2'>
              {devices.map((d) => (
                <Link
                  key={d.id}
                  href={`/sites/${siteId}/devices/${d.id}`}
                  className='group block rounded-2xl border border-zinc-900 bg-zinc-950/20 p-4 transition hover:bg-zinc-900/35 hover:border-zinc-800'
                >
                  <div className='flex items-center justify-between gap-4'>
                    <div className='min-w-0'>
                      <div className='truncate font-medium text-zinc-100'>
                        {d.name ?? d.externalId}
                      </div>
                      <div className='mt-1 truncate text-xs text-zinc-500'>
                        {d.externalId}
                      </div>
                    </div>

                    <div className='shrink-0 text-xs text-zinc-400'>
                      {d.kind}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className='flex flex-wrap gap-2'>
        <Link
          href='/sites'
          className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm font-medium transition hover:bg-zinc-900/50 hover:border-zinc-700'
        >
          ← Back to Sites
        </Link>
        <Link
          href='/sites/new'
          className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm font-medium transition hover:bg-zinc-900/50 hover:border-zinc-700'
        >
          + New Site
        </Link>
      </div>
    </div>
  )
}
