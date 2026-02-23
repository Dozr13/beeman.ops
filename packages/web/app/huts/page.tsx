import { HutDto } from '@ops/shared'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pill
} from '../../components/ui'
import { apiGet } from '../../lib/api'

export default async function HutsPage() {
  const huts = await apiGet<HutDto[]>('/v1/huts')

  const assigned = huts.filter((h) => Boolean(h.currentSite?.id)).length
  const unassigned = huts.length - assigned

  return (
    <div className='px-6 py-6 md:px-10'>
      <div className='mx-auto w-full max-w-7xl space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div className='space-y-2'>
            <h1 className='text-3xl font-semibold tracking-tight'>Huts</h1>
            <p className='text-sm text-zinc-400'>
              Hash huts are devices/containers. They can be assigned to a site
              (location).
            </p>
            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Pill tone='neutral'>HUTS: {huts.length}</Pill>
              <Pill tone='neutral'>ASSIGNED: {assigned}</Pill>
              <Pill tone='neutral'>UNASSIGNED: {unassigned}</Pill>
            </div>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {huts.map((h) => {
            const site = h.currentSite
            return (
              <Card
                key={h.id}
                className='relative border-zinc-800 bg-zinc-950/20 transition hover:border-zinc-700 hover:bg-zinc-900/20'
              >
                <CardHeader className='flex flex-row items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <CardTitle className='truncate'>
                      {h.code}
                      {h.name ? ` • ${h.name}` : ''}
                    </CardTitle>
                    <div className='mt-1 text-xs text-zinc-400'>
                      <span className='text-zinc-300'>ID: {h.id}</span>
                    </div>
                  </div>

                  <div className='flex flex-col items-end gap-2'>
                    {site ? (
                      <Pill tone='good'>ASSIGNED</Pill>
                    ) : (
                      <Pill tone='bad'>UNASSIGNED</Pill>
                    )}
                  </div>
                </CardHeader>

                <CardContent className='space-y-4'>
                  <div className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                    <div className='text-xs text-zinc-500'>Current site</div>
                    <div className='mt-1 text-sm text-zinc-200'>
                      {site ? (site.name ?? site.code) : '—'}
                    </div>
                    {site ? (
                      <div className='mt-1 text-xs text-zinc-500'>
                        {site.code}
                      </div>
                    ) : null}
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Link
                      href={`/huts/${encodeURIComponent(h.code)}`}
                      className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                    >
                      Open hut →
                    </Link>

                    {site ? (
                      <Link
                        href={`/sites/${encodeURIComponent(site.id)}`}
                        className='rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-900/40'
                      >
                        View site →
                      </Link>
                    ) : null}
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
