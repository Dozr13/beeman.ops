'use client'

import type { UnitMode } from '@/lib/hut/types'
import { formatTH, rawToTH } from '@/lib/hut/types'
import { Badge, Button, Card, CardBody } from '@/lib/hut/ui'
import { Activity, HeartPulse } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

type HourPoint = {
  hour: string
  total: number
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
  const [range, setRange] = useState<'24h' | '7d'>('24h')
  const [view, setView] = useState<'hash' | 'health'>('hash')
  const [data, setData] = useState<HourPoint[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const days = range === '24h' ? 1 : 7
      const res = await fetch(
        `/api/huts/${encodeURIComponent(siteCode)}/miners/hourly?days=${days}`,
        { cache: 'no-store' }
      )
      const json = (await res.json()) as HourPoint[]
      if (!cancelled) setData(Array.isArray(json) ? json : [])
    })()
    return () => {
      cancelled = true
    }
  }, [siteCode, range])

  const chartData = useMemo(() => {
    return data.map((p) => {
      const th = rawToTH(p.total, unitMode)
      return { ...p, th }
    })
  }, [data, unitMode])

  const latest = chartData.at(-1)

  return (
    <Card>
      <CardBody className='p-3.5 sm:p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='text-sm font-semibold text-zinc-100 flex items-center gap-2'>
              {view === 'hash' ? (
                <Activity className='h-4 w-4 text-zinc-400' />
              ) : (
                <HeartPulse className='h-4 w-4 text-zinc-400' />
              )}
              {view === 'hash' ? 'Hashrate' : 'Health'} ({range})
            </div>

            <div className='mt-1 text-xs text-zinc-400'>
              Latest:{' '}
              {latest ? (
                <>
                  <span className='text-zinc-200'>
                    {formatTH(latest.th)} TH
                  </span>
                  <span className='text-zinc-500'>
                    {' '}
                    • unreachable {latest.unreachable} • apiDown{' '}
                    {latest.apiDown} • notHashing {latest.notHashing}
                  </span>
                </>
              ) : (
                '—'
              )}
            </div>

            <div className='mt-2 flex flex-wrap gap-2'>
              <Badge tone='muted'>
                {range === '24h' ? 'Last 24h' : 'Last 7d'}
              </Badge>
              {latest ? (
                <>
                  <Badge tone={latest.unreachable ? 'crit' : 'muted'}>
                    unreachable {latest.unreachable}
                  </Badge>
                  <Badge tone={latest.apiDown ? 'warn' : 'muted'}>
                    apiDown {latest.apiDown}
                  </Badge>
                  <Badge tone={latest.notHashing ? 'crit' : 'muted'}>
                    notHashing {latest.notHashing}
                  </Badge>
                </>
              ) : null}
            </div>
          </div>

          <div className='flex flex-col gap-2 items-end'>
            <div className='flex gap-2'>
              <Button
                variant='ghost'
                className={view === 'hash' ? 'bg-zinc-800' : ''}
                onClick={() => setView('hash')}
              >
                Hash
              </Button>
              <Button
                variant='ghost'
                className={view === 'health' ? 'bg-zinc-800' : ''}
                onClick={() => setView('health')}
              >
                Health
              </Button>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='ghost'
                className={range === '24h' ? 'bg-zinc-800' : ''}
                onClick={() => setRange('24h')}
              >
                24h
              </Button>
              <Button
                variant='ghost'
                className={range === '7d' ? 'bg-zinc-800' : ''}
                onClick={() => setRange('7d')}
              >
                7d
              </Button>
            </div>
          </div>
        </div>

        <div className='mt-4 h-44 sm:h-56'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='hour'
                tickFormatter={fmtHour}
                minTickGap={24}
                tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.55)' } as any}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.55)' } as any}
                tickFormatter={(v) => String(Math.round(Number(v)))}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,10,10,0.92)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.75)' }}
                labelFormatter={(v) => fmtHour(String(v))}
                formatter={(v: any, name) => {
                  if (name === 'th')
                    return [`${formatTH(Number(v))} TH`, 'Total']
                  return [v, name]
                }}
              />

              {view === 'hash' ? (
                <Line
                  type='monotone'
                  dataKey='th'
                  dot={false}
                  strokeWidth={2}
                />
              ) : (
                <>
                  <Line
                    type='monotone'
                    dataKey='unreachable'
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type='monotone'
                    dataKey='apiDown'
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type='monotone'
                    dataKey='notHashing'
                    dot={false}
                    strokeWidth={2}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
