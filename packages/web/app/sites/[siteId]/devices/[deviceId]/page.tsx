import { apiGet } from '../../../../../components/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../../../../components/ui'

type Device = {
  id: string
  siteId: string
  externalId: string
  kind: string
  name: string | null
  meta: any
}

type Metric = { ts: string; payload: any }

type PageProps = {
  params: Promise<{ siteId: string; deviceId: string }>
}

export default async function DevicePage({ params }: PageProps) {
  const { deviceId } = await params

  const dev = await apiGet<Device>(`/v1/devices/${deviceId}`)
  const latest = await apiGet<Metric[]>(
    `/v1/devices/${deviceId}/metrics/latest?limit=50`
  )

  return (
    <div className='mx-auto w-full max-w-5xl space-y-6'>
      <div className='flex flex-col gap-2'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {dev.name ?? dev.externalId}
          </h1>
          <Pill tone='neutral'>{dev.kind}</Pill>
        </div>
        <div className='text-sm text-zinc-400'>{dev.externalId}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest metrics</CardTitle>
          <div className='text-sm text-zinc-400'>
            Most recent payloads (raw). We’ll add charts once you decide which
            fields matter most.
          </div>
        </CardHeader>

        <CardContent>
          {latest.length === 0 ? (
            <div className='rounded-xl border border-zinc-900 bg-zinc-950/20 p-4 text-sm text-zinc-400'>
              No metrics yet.
            </div>
          ) : (
            <div className='space-y-3'>
              {latest.map((m) => (
                <div
                  key={m.ts}
                  className='rounded-2xl border border-zinc-900 bg-zinc-950/20 p-4'
                >
                  <div className='text-xs text-zinc-400'>
                    {new Date(m.ts).toLocaleString()}
                  </div>

                  <pre className='mt-3 max-h-[420px] overflow-auto rounded-xl border border-zinc-900 bg-black/30 p-3 text-xs text-zinc-100'>
                    {JSON.stringify(m.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
