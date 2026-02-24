import Link from 'next/link'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { PageShell } from '../../../../components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui'
import { apiGet } from '../../../../lib/api'

type DeviceListItem = {
  id: string
  externalId: string
  kind: string
  name: string | null
  createdAt: string
}

export default async function SiteDevicesPage({
  params
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const devices = await apiGet<DeviceListItem[]>(
    `/v1/sites/${encodeURIComponent(siteId)}/devices`
  )

  return (
    <PageShell>
      <PageHeader
        title='Devices'
        subtitle='All devices discovered/linked to this site.'
        backHref={`/sites/${encodeURIComponent(siteId)}`}
        backLabel='Site'
      />

      <Card className='border-zinc-800 bg-zinc-950/20'>
        <CardHeader>
          <CardTitle>Device list</CardTitle>
        </CardHeader>
        <CardContent>
          {devices?.length ? (
            <div className='space-y-2'>
              {devices.map((d) => (
                <Link
                  key={d.id}
                  href={`/sites/${encodeURIComponent(siteId)}/devices/${encodeURIComponent(d.id)}`}
                  className='block rounded-xl border border-zinc-800 bg-zinc-950/30 p-3 hover:bg-zinc-900/30'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <div className='text-sm font-medium text-zinc-100 break-words'>
                        {d.name ?? d.externalId}
                      </div>
                      <div className='mt-0.5 text-xs text-zinc-500 break-all'>
                        {d.kind} • {d.externalId}
                      </div>
                    </div>
                    <div className='text-xs text-zinc-500'>Open →</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className='text-sm text-zinc-500'>No devices yet.</div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
