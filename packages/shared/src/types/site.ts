import type { SiteType } from '../schema/site.js'

export type CurrentHutDto = {
  id: string
  code: string
  name: string | null
  // NOTE: not returned by your /v1/sites select today, so keep optional
  lastHeartbeat?: string | null
} | null

export type ExampleDataDto = {
  rangeStart: string
  rangeEnd: string
  note?: string
  sourceFile?: string
  sheet?: string
} | null

export type DailyGasMeterDto = {
  deviceId: string
  externalId: string
  ts: string
  date: string
  temp_f: number | null
  dp_inh2o: number | null
  lp_psi: number | null
  flow_hrs: number | null
  vol_mcf: number | null
  mmbtu: number | null
  raw?: any
}

export type DailyGasSummaryDto = {
  date: string
  ts: string
  totals: {
    vol_mcf: number | null
    mmbtu: number | null
    flow_hrs: number | null
  }
  meters: DailyGasMeterDto[]
} | null

export type SiteGeoDto = {
  /** Latitude in decimal degrees */
  lat: number
  /** Longitude in decimal degrees */
  lng: number
} | null

export type SiteDto = {
  id: string
  code: string
  name: string | null
  type: SiteType | null
  timezone: string | null
  meta: any
  hutCode: string | null
  createdAt: string
  lastHeartbeat: string | null
  currentHut?: CurrentHutDto

  // NEW: derived /sites fields (no schema changes required)
  exampleData?: ExampleDataDto
  dailyGas?: DailyGasSummaryDto

  // NEW: derived geo fields (stored in meta.geo or sometimes encoded in code)
  geo?: SiteGeoDto
}

export type SiteDetailDto = SiteDto & {
  ingestKey: string | null
}
