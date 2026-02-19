export type MinerRecordDto = {
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
