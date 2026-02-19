'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardBody } from '@/lib/hut/ui'
import { Activity } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { formatTH, rawToTH } from '@/lib/hut/types'
import type { UnitMode } from '@/lib/hut/types'

type HourPoint = {
  hour: string
  total: number // still “MHS” (agent naming)
  unreachable: number
  apiDown: number
  notHashing: number
}

const fmtHour = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit'
  })
}

export const HutGraphs: React.FC<{ siteCode: string; unitMode: UnitMode }> = ({
  siteCode,
  unitMode
}) => {
  const [data, setData] = useState<HourPoint[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(
        `/api/huts/${encodeURIComponent(siteCode)}/miners/hourly?days=7`,
        { cache: 'no-store' }
      )
      const json = (await res.json()) as HourPoint[]
      if (!cancelled) setData(Array.isArray(json) ? json : [])
    })()
    return () => {
      cancelled = true
    }
  }, [siteCode])

  const chartData = useMemo(() => {
    return data.map((p) => {
      // rawToTH expects “raw” to be in whatever your unitMode expects.
      // Your agent values are actually MH/s (but stored under ghs_* keys).
      // Your existing AUTO logic treats huge values as MH/s, so keep consistent:
      const th = rawToTH(p.total, unitMode) // shows “TH” in UI
      return {
        ...p,
        th
      }
    })
  }, [data, unitMode])

  const latest = chartData.at(-1)

  return (
    <Card>
      <CardBody className='p-3.5 sm:p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-zinc-100 flex items-center gap-2'>
              <Activity className='h-4 w-4 text-zinc-500' />
              Total Hashrate (7 days, hourly)
            </div>
            <div className='mt-1 text-xs text-zinc-400'>
              Latest: {latest ? `${formatTH(latest.th)} TH` : '—'}
              {latest
                ? ` • unreachable ${latest.unreachable} • apiDown ${latest.apiDown} • notHashing ${latest.notHashing}`
                : ''}
            </div>
          </div>
        </div>

        <div className='mt-4 h-56'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='hour' tickFormatter={fmtHour} minTickGap={24} />
              <YAxis tickFormatter={(v) => String(Math.round(v))} />
              <Tooltip
                labelFormatter={(v) => fmtHour(String(v))}
                formatter={(v: any, name) => {
                  if (name === 'th')
                    return [`${formatTH(Number(v))} TH`, 'Total']
                  return [v, name]
                }}
              />
              <Line type='monotone' dataKey='th' dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
