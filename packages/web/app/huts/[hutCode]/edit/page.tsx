'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { PageShell } from '../../../../components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui'

type SiteOpt = { id: string; code: string; name: string | null }
type HutDto = {
  id: string
  code: string
  name: string | null
  currentSite: { id: string; code: string; name: string | null } | null
}

export default function EditHutPage() {
  const router = useRouter()
  const { hutCode } = useParams<{ hutCode: string }>()

  const [hut, setHut] = useState<HutDto | null>(null)
  const [sites, setSites] = useState<SiteOpt[]>([])

  const [name, setName] = useState('')
  const [siteId, setSiteId] = useState('')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [hutRes, sitesRes] = await Promise.all([
        fetch(`/api/huts/${encodeURIComponent(hutCode)}`, { cache: 'no-store' }),
        fetch('/api/sites', { cache: 'no-store' })
      ])

      const hutJson = await hutRes.json()
      const sitesJson = await sitesRes.json().catch(() => [])
      if (cancelled) return

      setHut(hutJson)
      setSites(Array.isArray(sitesJson) ? sitesJson : [])

      setName(hutJson?.name ?? '')
      setSiteId(hutJson?.currentSite?.id ?? '')
    })().catch((e) => {
      if (cancelled) return
      setErr(String(e?.message ?? e))
    })

    return () => {
      cancelled = true
    }
  }, [hutCode])

  const inputBase =
    'w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800/60'

  const assignmentChanged = useMemo(() => {
    const cur = hut?.currentSite?.id ?? ''
    return siteId !== cur
  }, [siteId, hut])

  const nameChanged = useMemo(() => {
    const cur = hut?.name ?? ''
    return name.trim() !== cur
  }, [name, hut])

  const submit = async () => {
    if (!hut) return
    setSaving(true)
    setErr(null)
    try {
      if (nameChanged) {
        const patchRes = await fetch(
          `/api/huts-by-id/${encodeURIComponent(hut.id)}`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: name.trim() || null })
          }
        )
        if (!patchRes.ok) throw new Error(await patchRes.text())
      }

      if (assignmentChanged) {
        const assignRes = await fetch(
          `/api/huts-by-id/${encodeURIComponent(hut.id)}/assign`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ siteId: siteId || null })
          }
        )
        if (!assignRes.ok) throw new Error(await assignRes.text())
      }

      router.push(`/huts/${encodeURIComponent(hut.code)}`)
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  if (!hut) {
    return (
      <PageShell size='md'>
        <div className='rounded-2xl border border-zinc-900 bg-zinc-950/20 p-4 text-sm text-zinc-400'>
          Loading…
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell size='md'>
      <PageHeader
        title='Edit Hut'
        subtitle='Update hut fields and assign/move it between sites.'
        backHref={`/huts/${encodeURIComponent(hut.code)}`}
        backLabel={hut.code}
      />

      <Card className='border-zinc-800 bg-zinc-950/20'>
        <CardHeader>
          <CardTitle>{hut.code}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-5'>
          {err ? (
            <div className='rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-300'>
              {err}
            </div>
          ) : null}

          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
              placeholder='Hash Hut 180'
            />
          </div>

          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Assigned site</div>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className={inputBase}
            >
              <option value=''>— None —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}{s.name ? ` • ${s.name}` : ''}
                </option>
              ))}
            </select>
            <div className='text-xs text-zinc-500'>This writes a HutAssignment using hutId → siteId.</div>
          </div>

          <div className='flex flex-wrap gap-3 pt-1'>
            <button
              onClick={submit}
              disabled={saving}
              className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900/50 hover:border-zinc-700 disabled:opacity-60'
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => router.push(`/huts/${encodeURIComponent(hut.code)}`)}
              className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900/40 hover:border-zinc-700'
            >
              Cancel
            </button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}
