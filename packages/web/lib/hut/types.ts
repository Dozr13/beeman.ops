export type MinerRecord = {
  ip: string
  reachable: boolean
  api_4028: boolean

  ts?: string | null
  loc?: string | null

  ghs_5s?: number | null
  ghs_av?: number | null
  ghs_1m?: number | null
  ghs_5m?: number | null
  ghs_15m?: number | null

  uptime_s?: number | null
  accepted?: number | null
  rejected?: number | null

  fan_in?: number | null
  fan_out?: number | null
  power_w?: number | null
  voltage_mv?: number | null

  pool_url?: string | null
  pool_user?: string | null
  pool_status?: string | null

  errors?: string[] | null
  raw?: unknown
}

export type UnitMode = 'auto' | 'ghs' | 'mhs'

export const bestHashRaw = (m: MinerRecord) =>
  m.ghs_5s ?? m.ghs_1m ?? m.ghs_5m ?? m.ghs_15m ?? m.ghs_av ?? null

/**
 * Fixes GH vs MH confusion:
 * - GH/s => TH = GH / 1000
 * - MH/s => TH = MH / 1,000,000
 * - AUTO: raw >= 1,000,000 => MH/s else GH/s
 */
// export const rawToTH = (raw: number, mode: UnitMode): number => {
//   if (mode === 'ghs') return raw / 1000
//   if (mode === 'mhs') return raw / 1_000_000
//   return raw >= 1_000_000 ? raw / 1_000_000 : raw / 1000
// }
export const rawToTH = (raw: number, unitMode: UnitMode) => {
  // unitMode: 'auto' | 'ghs' | 'mhs'
  if (!Number.isFinite(raw)) return null

  if (unitMode === 'ghs') return raw / 1_000 // GH/s -> TH/s
  if (unitMode === 'mhs') return raw / 1_000_000 // MH/s -> TH/s

  // auto:
  // WhatsMiner values are usually huge MH/s (tens of millions).
  // If it's > 1,000,000 it's almost certainly MH/s.
  return raw > 1_000_000 ? raw / 1_000_000 : raw / 1_000
}

export const formatTH = (th: number | null | undefined) => {
  if (th == null || Number.isNaN(th)) return '—'
  return th.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export const formatInt = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString()
}

export const classify = (m: MinerRecord, th: number | null) => {
  const errs = new Set((m.errors ?? []).filter(Boolean))

  const notHashing = m.api_4028 && (th == null || th < 0.5)
  const apiDown = m.reachable && !m.api_4028
  const unreachable = !m.reachable

  const critical =
    unreachable ||
    notHashing ||
    errs.has('chip_id_read_error') ||
    errs.has('temp_read_error') ||
    errs.has('lost_chain')

  const warn =
    apiDown ||
    errs.has('overheat') ||
    errs.has('fan_error') ||
    errs.has('pool_dead')

  const bucket: 'OK' | 'WARN' | 'CRIT' = critical
    ? 'CRIT'
    : warn
      ? 'WARN'
      : 'OK'

  const replace =
    unreachable || errs.has('chip_id_read_error') || errs.has('temp_read_error')
  const investigate =
    notHashing ||
    errs.has('lost_chain') ||
    errs.has('fan_error') ||
    errs.has('overheat') ||
    errs.has('pool_dead') ||
    apiDown

  return {
    bucket,
    notHashing,
    apiDown,
    unreachable,
    errs: [...errs],
    replace,
    investigate
  }
}
