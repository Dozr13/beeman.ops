'use client'

import { SiteType } from '@ops/shared'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageShell } from '../../../components/layout/PageShell'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../components/ui'

const toNum = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export default function NewSitePage() {
  const router = useRouter()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [type, setType] = useState<SiteType>('UNKNOWN')
  const [timezone, setTimezone] = useState('America/Denver')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const inputBase =
    'w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800/60'

  const geo = useMemo(() => {
    const lt = lat.trim()
    const ln = lon.trim()
    if (!lt && !ln) return null
    const latVal = toNum(lt)
    const lonVal = toNum(ln)
    if (latVal == null || lonVal == null)
      return { error: 'Latitude/Longitude must be numbers.' }
    if (latVal < -90 || latVal > 90)
      return { error: 'Latitude must be between -90 and 90.' }
    if (lonVal < -180 || lonVal > 180)
      return { error: 'Longitude must be between -180 and 180.' }
    return { value: { lat: latVal, lng: lonVal } }
  }, [lat, lon])

  const submit = async () => {
    setSaving(true)
    setErr(null)

    try {
      if (geo && 'error' in geo) {
        setErr(geo.error ?? null)
        setSaving(false)
        return
      }

      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim() ? name.trim() : null,
          type,
          timezone: timezone.trim() || 'America/Denver',
          // ✅ this is what powers Directions (stored as meta.geo)
          geo: geo && 'value' in geo ? geo.value : undefined
        })
      })

      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()

      router.push(`/sites/${json.id}`, { scroll: true })
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  // Nice UX: allow pasting "40.6,-107.9" into the Latitude box and it fills both
  const onLatChange = (v: string) => {
    if (v.includes(',')) {
      const [a, b] = v.split(',')
      setLat((a ?? '').trim())
      setLon((b ?? '').trim())
      return
    }
    setLat(v)
  }

  return (
    <PageShell size='md'>
      <PageHeader
        title='New Site'
        subtitle='Create a site (location). Assign huts later from “Edit Site”.'
        backHref='/sites'
        backLabel='Sites'
      />

      <Card className='border-zinc-800 bg-zinc-950/20'>
        <CardHeader>
          <CardTitle>Site details</CardTitle>
        </CardHeader>

        <CardContent className='space-y-5'>
          {err ? (
            <div className='rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-300'>
              {err}
            </div>
          ) : null}

          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Code (required)</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputBase}
              placeholder='Bulldog-26'
            />
            <div className='text-xs text-zinc-500'>
              Short, unique identifier. This is what you’ll see everywhere.
            </div>
          </div>

          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Name (optional)</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
              placeholder='Bulldog Pad • North'
            />
          </div>

          {/* ✅ Coordinates */}
          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Coordinates (optional)</div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <div className='text-xs text-zinc-500'>Latitude</div>
                <input
                  value={lat}
                  onChange={(e) => onLatChange(e.target.value)}
                  className={inputBase}
                  placeholder='40.609484'
                />
              </div>

              <div className='space-y-2'>
                <div className='text-xs text-zinc-500'>Longitude</div>
                <input
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className={inputBase}
                  placeholder='-107.911308'
                />
              </div>
            </div>

            <div className='text-xs text-zinc-500'>
              Used for “Get directions”. Stored as{' '}
              <span className='text-zinc-300'>meta.geo.lat/lng</span>. Tip:
              paste <span className='text-zinc-300'>lat,lng</span> into Latitude
              and it will auto-split.
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='text-sm text-zinc-400'>Type</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SiteType)}
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

          <div className='flex flex-wrap gap-3 pt-1'>
            <button
              onClick={submit}
              disabled={saving || !code.trim()}
              className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900/50 hover:border-zinc-700 disabled:opacity-60'
            >
              {saving ? 'Saving…' : 'Create site'}
            </button>

            <button
              onClick={() => router.push('/sites', { scroll: true })}
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
