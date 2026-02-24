'use client'

import { getSiteLatLng, HutDto, SiteDto } from '@ops/shared'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { PageShell } from '../../../../components/layout/PageShell'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../../components/ui'

export default function EditSitePage() {
  const router = useRouter()
  const { siteId } = useParams<{ siteId: string }>()

  const [site, setSite] = useState<SiteDto | null>(null)
  const [huts, setHuts] = useState<HutDto[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<
    'UNKNOWN' | 'WELL' | 'PAD' | 'FACILITY' | 'YARD'
  >('UNKNOWN')

  const [timezone, setTimezone] = useState('America/Denver')

  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')

  // assignment
  const [selectedHutId, setSelectedHutId] = useState<string>('')

  const inputBase =
    'w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800/60'

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const [siteRes, hutsRes] = await Promise.all([
        fetch(`/api/sites/${encodeURIComponent(siteId)}`, {
          cache: 'no-store'
        }),
        fetch('/api/huts', { cache: 'no-store' })
      ])

      const siteJson = await siteRes.json()
      const hutsJson = await hutsRes.json()

      if (cancelled) return

      setSite(siteJson)
      setHuts(Array.isArray(hutsJson) ? hutsJson : [])

      setCode(siteJson.code ?? '')
      setName(siteJson.name ?? '')
      setType(siteJson.type ?? 'UNKNOWN')
      setTimezone(siteJson.timezone ?? 'America/Denver')

      const geo = getSiteLatLng(siteJson as any)
      setLat(geo?.lat != null ? String(geo.lat) : '')
      setLon(geo?.lng != null ? String(geo.lng) : '')

      // current assignment from API
      setSelectedHutId(siteJson.currentHut?.id ?? '')
    })().catch((e) => {
      if (cancelled) return
      setErr(String(e?.message ?? e))
    })

    return () => {
      cancelled = true
    }
  }, [siteId])

  const currentAssignedHutId = site?.currentHut?.id ?? ''
  const assignmentChanged = useMemo(
    () => selectedHutId !== currentAssignedHutId,
    [selectedHutId, currentAssignedHutId]
  )

  const submit = async () => {
    setSaving(true)
    setErr(null)

    try {
      // 1) patch site fields (existing behavior)
      const patchRes = await fetch(`/api/sites/${encodeURIComponent(siteId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          name: name || null,
          type,
          timezone,
          geo:
            lat.trim() && lon.trim()
              ? { lat: Number(lat.trim()), lng: Number(lon.trim()) }
              : null
        }),
        cache: 'no-store'
      })
      if (!patchRes.ok) throw new Error(await patchRes.text())

      // 2) assignment (ONLY if changed)
      if (assignmentChanged) {
        // unassign current hut if user selects "None"
        if (!selectedHutId) {
          if (currentAssignedHutId) {
            const unassignRes = await fetch(
              `/api/huts-by-id/${encodeURIComponent(currentAssignedHutId)}/assign`,
              {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ siteId: null }),
                cache: 'no-store'
              }
            )
            if (!unassignRes.ok) throw new Error(await unassignRes.text())
          }
        } else {
          // assign selected hut to this site (moves it if assigned elsewhere)
          const assignRes = await fetch(
            `/api/huts-by-id/${encodeURIComponent(selectedHutId)}/assign`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ siteId }),
              cache: 'no-store'
            }
          )
          if (!assignRes.ok) throw new Error(await assignRes.text())
        }
      }

      router.push(`/sites/${siteId}`)
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  if (!site) {
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
        title='Edit Site'
        subtitle='Update site fields and assign/move the hut.'
        backHref={`/sites/${encodeURIComponent(siteId)}`}
        backLabel={site.code}
      />

      <Card className='border-zinc-800 bg-zinc-950/20'>
        <CardHeader>
          <CardTitle>{site.code}</CardTitle>
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
            />
          </div>

          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
            />
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='text-sm text-zinc-400'>Type</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className={inputBase}
              >
                <option value='UNKNOWN'>UNKNOWN</option>
                <option value='WELL'>WELL</option>
                <option value='PAD'>PAD</option>
                <option value='FACILITY'>FACILITY</option>
                <option value='YARD'>YARD</option>
              </select>
            </div>

            <div className='space-y-2'>
              <div className='text-sm text-zinc-400'>Timezone</div>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputBase}
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='text-sm text-zinc-400'>Latitude</div>
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className={inputBase}
                placeholder='40.609484'
                inputMode='decimal'
              />
            </div>

            <div className='space-y-2'>
              <div className='text-sm text-zinc-400'>Longitude</div>
              <input
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className={inputBase}
                placeholder='-107.911308'
                inputMode='decimal'
              />
            </div>
          </div>

          {/* Hut assignment */}
          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Assigned Hut</div>
            <select
              value={selectedHutId}
              onChange={(e) => setSelectedHutId(e.target.value)}
              className={inputBase}
            >
              <option value=''>— None —</option>

              {huts.map((h) => {
                const label = `${h.code}${h.name ? ` • ${h.name}` : ''}`
                const otherSite =
                  h.currentSite && h.currentSite.id !== siteId
                    ? h.currentSite
                    : null

                return (
                  <option key={h.id} value={h.id}>
                    {label}
                    {otherSite
                      ? ` (assigned to ${otherSite.name ?? otherSite.code})`
                      : ''}
                  </option>
                )
              })}
            </select>

            <div className='text-xs text-zinc-500'>
              This writes a HutAssignment using hutId → siteId.
            </div>
          </div>

          <div className='flex flex-wrap gap-3 pt-1'>
            <button
              onClick={submit}
              disabled={saving || !code.trim()}
              className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900/50 hover:border-zinc-700 disabled:opacity-60'
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            <button
              onClick={() => router.push(`/sites/${siteId}`)}
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
