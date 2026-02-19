'use client'

import type { MinerRecord } from '@/lib/hut/types'
import { Button, Card, CardBody } from '@/lib/hut/ui'
import { ChevronDown, UploadCloud } from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'

function parseJson(text: string): MinerRecord[] {
  const parsed: unknown = JSON.parse(text)

  const minersRaw: unknown = Array.isArray(parsed)
    ? parsed
    : (parsed as any)?.miners

  if (!Array.isArray(minersRaw)) {
    throw new Error(
      'JSON must be an array of miners OR an object with { miners: [...] }'
    )
  }

  return (minersRaw as any[]).map((m): MinerRecord => {
    const ip = String(m.ip ?? '')
    if (!ip) throw new Error('Miner record missing ip')

    const api_4028 = Boolean(m.api_4028)
    const reachable = typeof m.reachable === 'boolean' ? m.reachable : true

    const errors =
      m.errors == null
        ? null
        : Array.isArray(m.errors)
          ? (m.errors.filter(Boolean) as string[])
          : null

    const th5 = typeof m.th_5s === 'number' ? m.th_5s : null
    const tha = typeof m.th_av === 'number' ? m.th_av : null

    const ghs_5s =
      typeof m.ghs_5s === 'number' ? m.ghs_5s : th5 != null ? th5 * 1000 : null

    const ghs_av =
      typeof m.ghs_av === 'number' ? m.ghs_av : tha != null ? tha * 1000 : null

    return {
      ip,
      reachable,
      api_4028,

      ghs_5s,
      ghs_av,
      ghs_1m: typeof m.ghs_1m === 'number' ? m.ghs_1m : null,
      ghs_5m: typeof m.ghs_5m === 'number' ? m.ghs_5m : null,
      ghs_15m: typeof m.ghs_15m === 'number' ? m.ghs_15m : null,

      uptime_s: typeof m.uptime_s === 'number' ? m.uptime_s : null,
      accepted: typeof m.accepted === 'number' ? m.accepted : null,
      rejected: typeof m.rejected === 'number' ? m.rejected : null,

      fan_in: typeof m.fan_in === 'number' ? m.fan_in : null,
      fan_out: typeof m.fan_out === 'number' ? m.fan_out : null,
      power_w: typeof m.power_w === 'number' ? m.power_w : null,
      voltage_mv: typeof m.voltage_mv === 'number' ? m.voltage_mv : null,

      pool_url: typeof m.pool_url === 'string' ? m.pool_url : null,
      pool_user: typeof m.pool_user === 'string' ? m.pool_user : null,
      pool_status: typeof m.pool_status === 'string' ? m.pool_status : null,

      errors,
      raw: m.raw ?? m
    }
  })
}

export const JsonLoader: React.FC<{
  onLoad: (miners: MinerRecord[]) => void
  defaultOpen?: boolean
}> = ({ onLoad, defaultOpen = false }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(defaultOpen)

  const loadFile = useCallback(
    async (file: File) => {
      setErr(null)
      try {
        const text = await file.text()
        const miners = parseJson(text)
        onLoad(miners)
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load JSON')
      }
    },
    [onLoad]
  )

  return (
    <Card className={drag ? 'border-indigo-500/60 bg-indigo-500/5' : ''}>
      {/* add real padding so nothing hugs edges */}
      <CardBody className='p-3.5 sm:p-5'>
        {/* Header row (always visible) */}
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setOpen((v) => !v)}
                className='group inline-flex items-center gap-2 text-sm font-medium text-zinc-100 hover:text-zinc-50'
                aria-expanded={open}
              >
                <span>Load miner snapshot</span>
                <ChevronDown
                  className={[
                    'h-4 w-4 text-zinc-500 transition-transform duration-200 group-hover:text-zinc-300',
                    open ? 'rotate-180' : ''
                  ].join(' ')}
                />
              </button>
            </div>

            <div className='mt-1 text-xs text-zinc-400 leading-snug'>
              Drag & drop <span className='font-mono'>miners_status.json</span>{' '}
              or pick a file.
              {!open ? (
                <span className='text-zinc-500'> (collapsed)</span>
              ) : null}
            </div>
          </div>

          <input
            ref={inputRef}
            type='file'
            accept='application/json'
            className='hidden'
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void loadFile(f)
            }}
          />

          <div className='shrink-0 flex items-center gap-2'>
            <Button
              variant='ghost'
              onClick={() => inputRef.current?.click()}
              className='px-3 py-2'
            >
              <UploadCloud className='h-4 w-4 mr-2' />
              Choose JSON
            </Button>

            <button
              type='button'
              onClick={() => setOpen((v) => !v)}
              className='rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900/50 transition'
            >
              {open ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Collapsible body */}
        <div
          className={[
            'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
            open
              ? 'grid-rows-[1fr] opacity-100 mt-4'
              : 'grid-rows-[0fr] opacity-70 mt-2'
          ].join(' ')}
        >
          <div className='overflow-hidden'>
            <div
              className={[
                'rounded-xl border border-dashed bg-zinc-950/30 text-center',
                drag ? 'border-indigo-500/60' : 'border-zinc-800'
              ].join(' ')}
              // smaller + cleaner (was p-6)
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDrag(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDrag(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDrag(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDrag(false)
                const f = e.dataTransfer.files?.[0]
                if (f) void loadFile(f)
              }}
            >
              <div className='px-4 py-4 sm:px-6 sm:py-5'>
                <div className='text-sm text-zinc-300'>Drop file here</div>
                <div className='text-xs text-zinc-600 mt-1'>
                  No uploading. All local.
                </div>
              </div>
            </div>

            {err ? (
              <div className='mt-3 rounded-xl border border-rose-800/60 bg-rose-500/10 p-3 text-sm text-rose-200'>
                {err}
              </div>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
