'use client'

import { SiteType } from '@ops/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../components/ui'

export default function NewSitePage() {
  const router = useRouter()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<SiteType>('UNKNOWN')
  const [timezone, setTimezone] = useState('America/Denver')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim() ? name.trim() : null,
          type,
          timezone: timezone.trim() || 'America/Denver',
          geo:
            lat.trim() && lon.trim()
              ? { lat: Number(lat.trim()), lng: Number(lon.trim()) }
              : undefined
        })
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      router.push(`/sites/${json.id}`)
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const inputBase =
    'w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800/60'

  return (
    <div className='mx-auto w-full max-w-3xl space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>New Site</h1>
        <p className='mt-1 text-sm text-zinc-400'>
          Create a site (location). Assign huts later from “Edit Site”.
        </p>
      </div>

      <Card>
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
            <div className='text-sm text-zinc-400'>Code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputBase}
            placeholder='Bulldog-26'
            />
            <div className='text-xs text-zinc-500'>
              Stable identifier used by agents/imports (e.g. Bulldog-26, wf-...).
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

          <div className='space-y-2'>
            <div className='text-sm text-zinc-400'>Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
              placeholder='Bulldog-26'
            />
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
              onClick={() => router.push('/sites')}
              className='inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900/40 hover:border-zinc-700'
            >
              Cancel
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
