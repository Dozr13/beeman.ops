import type { SiteType } from '../schema/site.js'

export type CurrentHutDto = {
  id: string
  code: string
  name: string | null
  // NOTE: not returned by your /v1/sites select today, so keep optional
  lastHeartbeat?: string | null
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
}

export type SiteDetailDto = SiteDto & {
  ingestKey: string | null
}
