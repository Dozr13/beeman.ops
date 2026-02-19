import type { Severity } from '../schema/alert.js'

export type AlertSeverity = Severity

/**
 * Canonical Alert row returned by the API.
 * Matches: GET /v1/alerts/recent
 */
export type AlertDto = {
  id: string
  siteId: string | null
  deviceId: string | null
  severity: AlertSeverity
  code: string
  message: string
  details: any | null
  createdAt: string
  resolvedAt: string | null
}
/**
 * Payload shape you POST when creating an alert (if/when you expose it).
 * Prefer importing AlertCreate from ../schema/alert for validation,
 * but this is useful as a DTO type for clients.
 */
export type AlertCreateDto = {
  siteId: string
  deviceId?: string
  severity: AlertSeverity
  code: string
  message: string
  details?: Record<string, any>
}
