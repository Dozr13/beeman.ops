import type { HutDto } from '@ops/shared'
import Link from 'next/link'
import { HutsClient } from '../../components/huts/HutsClient'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageShell } from '../../components/layout/PageShell'
import { apiGet } from '../../lib/api'

const parseQ = (sp: Record<string, string | string[] | undefined>) => {
  const raw = sp.q
  const q = Array.isArray(raw) ? raw[0] : raw
  return (q ?? '').toString()
}

export default async function HutsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const q = parseQ(sp)

  const huts = await apiGet<HutDto[]>('/v1/huts')

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

      <HutsClient huts={huts} initialQ={q} />
    </PageShell>
  )
}
