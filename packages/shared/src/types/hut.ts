export type CurrentSiteDto = {
  id: string
  code: string
  name: string | null
} | null

/**
 * Hut list row DTO.
 * Used by: GET /v1/huts (and embedded on site list pages).
 */
export type HutDto = {
  id: string
  code: string
  name: string | null

  // optional because different endpoints may include or omit these
  siteId?: string | null
  meta?: any
  createdAt?: string
  lastHeartbeat?: string | null

  currentSite?: CurrentSiteDto
}

/**
 * Hut detail DTO.
 * Used by: GET /v1/huts/:hutCode
 */
export type HutDetailDto = HutDto & {
  // if your hut detail endpoint returns assigned/derived site
  site?: CurrentSiteDto
}
