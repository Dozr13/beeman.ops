'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageShell } from '../../../components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui'

type SiteOpt = { id: string; code: string; name: string | null }

export default function NewHutPage() {
  const router = useRouter()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [siteId, setSiteId] = useState<string>('')
  const [sites, setSites] = useState<SiteOpt[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/sites', { cache: 'no-store' })
      const json = await res.json().catch(() => [])
      if (cancelled) return
      setSites(Array.isArray(json) ? json : [])
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const inputBase =
    'w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800/60'

  const submit = async () => {
    setSaving(true)
    setErr(null)
    try {
      const createRes = await fetch('/api/huts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), name: name.trim() || null })
      })
      if (!createRes.ok) throw new Error(await createRes.text())
      const created = await createRes.json()
      const hutId = created?.hut?.id
      const hutCode = created?.hut?.code

      if (hutId && siteId) {
        const assignRes = await fetch(
          `/api/huts-by-id/${encodeURIComponent(hutId)}/assign`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ siteId })
          }
        )
        if (!assignRes.ok) throw new Error(await assignRes.text())
      }

      router.push(hutCode ? `/huts/${encodeURIComponent(hutCode)}` : '/huts')
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell size='md'>
      <PageHeader
        title='New Hut'
        subtitle='Create a hut and optionally assign it to a site.'
        backHref='/huts'
        backLabel='Huts'
      />

      <Card className='border-zinc-800 bg-zinc-950/20'>
        <CardHeader>
          <CardTitle>Hut details</CardTitle>
        </CardHeader>
        <CardContent className='space-y-5'>
          {err ? (
            <div className='rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-300'>
              {err}
            </div>
          ) : null}

          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputBase}
              placeholder='GH180'
            />
            <div className='text-xs text-zinc-500'>Stable hut identifier (e.g. GH180).</div>
          </div>

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
            <div className='text-sm text-zinc-400'>Assign to site (optional)</div>
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
          </div>

          <div className='flex flex-wrap gap-3 pt-1'>
            <button
              onClick={submit}
              disabled={saving || !code.trim()}
              className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900/50 hover:border-zinc-700 disabled:opacity-60'
            >
              {saving ? 'Saving…' : 'Create hut'}
            </button>

            <button
              onClick={() => router.push('/huts')}
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
