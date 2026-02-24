import { HutDto } from '@ops/shared'
import Link from 'next/link'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageShell } from '../../components/layout/PageShell'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../components/ui'
import { apiGet } from '../../lib/api'

type HutListItem = {
  id: string
  code: string
  name: string | null
  currentSite: { id: string; code: string; name: string | null } | null
}

export default async function HutsPage() {
  const huts = await apiGet<HutDto[]>(`/v1/huts`)

  return (
    <PageShell>
      <PageHeader
        title='Huts'
        subtitle='HashHuts are mobile containers. Create/edit and assign them to sites.'
        actions={
          <Link
            href='/huts/new'
            className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
          >
            New hut
          </Link>
        }
      />

      <Card className='border-zinc-800 bg-zinc-950/20'>
        <CardHeader>
          <CardTitle>All huts</CardTitle>
        </CardHeader>
        <CardContent>
          {huts?.length ? (
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {huts.map((h) => (
                <div
                  key={h.id}
                  className='rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='text-lg font-semibold text-zinc-100'>
                        {h.code}
                      </div>
                      <div className='text-sm text-zinc-400 break-words'>
                        {h.name ?? '—'}
                      </div>
                    </div>
                    {h.currentSite ? (
                      <Pill tone='neutral'>ASSIGNED</Pill>
                    ) : (
                      <Pill tone='warn'>UNASSIGNED</Pill>
                    )}
                  </div>

                  <div className='mt-3 text-xs text-zinc-500'>
                    {h.currentSite ? (
                      <>
                        Site: {h.currentSite.code}
                        {h.currentSite.name ? ` • ${h.currentSite.name}` : ''}
                      </>
                    ) : (
                      'No site assigned.'
                    )}
                  </div>

                  <div className='mt-4 flex flex-wrap gap-2'>
                    <Link
                      href={`/huts/${encodeURIComponent(h.code)}`}
                      className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                    >
                      Open
                    </Link>
                    <Link
                      href={`/huts/${encodeURIComponent(h.code)}/edit`}
                      className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                    >
                      Edit
                    </Link>
                    {h.currentSite ? (
                      <Link
                        href={`/sites/${encodeURIComponent(h.currentSite.id)}`}
                        className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                      >
                        Site
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-sm text-zinc-500'>No huts yet.</div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
