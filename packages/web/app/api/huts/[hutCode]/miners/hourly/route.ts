import { NextResponse } from 'next/server'

type MinerDto = {
  ip: string
  reachable: boolean
  api_4028: boolean
  ts?: string | null
  loc?: string | null
  ghs_av?: number | null
  ghs_5s?: number | null
  ghs_1m?: number | null
  power_w?: number | null
  errors?: string[] | null
}

const hash32 = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const noisePct = (seed: string, pct = 0.03) => {
  // deterministic noise in [-pct/2, +pct/2]
  const x = (hash32(seed) % 10_000) / 10_000
  return (x - 0.5) * pct
}

const bestHash = (m: MinerDto) =>
  (typeof m.ghs_av === 'number' ? m.ghs_av : null) ??
  (typeof m.ghs_5s === 'number' ? m.ghs_5s : null) ??
  (typeof m.ghs_1m === 'number' ? m.ghs_1m : null) ??
  0

const buildSyntheticSeries = (hutCode: string, miners: MinerDto[], days: number) => {
  const now = new Date()
  const end = new Date(now)
  end.setMinutes(0, 0, 0)

  const start = new Date(end)
  start.setHours(start.getHours() - days * 24)

  const baseTotal = miners.reduce((acc, m) => acc + (bestHash(m) || 0), 0)

  const unreachable = miners.filter((m) => !m.reachable).length
  const apiDown = miners.filter((m) => m.reachable && !m.api_4028).length
  const notHashing = miners.filter((m) => m.api_4028 && bestHash(m) < 0.5).length

  const out: Array<{
    hour: string
    total: number
    unreachable: number
    apiDown: number
    notHashing: number
    synthetic: boolean
  }> = []

  const hours = Math.max(1, days * 24)
  for (let i = 0; i <= hours; i++) {
    const d = new Date(start)
    d.setHours(d.getHours() + i)

    // tiny variation so the line isn't dead-flat
    const pct = noisePct(`${hutCode}:${d.toISOString()}`)
    const total = Math.max(0, baseTotal * (1 + pct))

    out.push({
      hour: d.toISOString(),
      total,
      unreachable,
      apiDown,
      notHashing,
      synthetic: true
    })
  }

  return out
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ hutCode: string }> }
) {
  const { hutCode } = await ctx.params
  const apiBase =
    process.env.OPS_API_BASE ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3002'

  const url = new URL(
    `${apiBase}/v1/huts/${encodeURIComponent(hutCode)}/miners/hourly`
  )

  const reqUrl = new URL(req.url)
  reqUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

  // Try real hourly data first (preferred)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (res.ok) {
    const json = await res.json()
    if (Array.isArray(json) && json.length) {
      return NextResponse.json(json, { status: 200 })
    }
  }

  // Fallback: synthesize a tiny series from the latest stored snapshot
  const minersRes = await fetch(
    `${apiBase}/v1/huts/${encodeURIComponent(hutCode)}/miners`,
    { cache: 'no-store' }
  )

  if (!minersRes.ok) return NextResponse.json([], { status: 200 })

  const minersJson = (await minersRes.json()) as { miners?: MinerDto[] }
  const miners = Array.isArray(minersJson.miners) ? minersJson.miners : []

  const days = Math.max(
    1,
    Math.min(7, Number(reqUrl.searchParams.get('days') ?? '1') || 1)
  )

  const synthetic = buildSyntheticSeries(hutCode, miners, days)
  return NextResponse.json(synthetic, { status: 200 })
}
