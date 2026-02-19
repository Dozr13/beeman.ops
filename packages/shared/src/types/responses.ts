import type { AlertDto } from './alert.js'
import type { DeviceDto } from './device.js'
import type { HutDetailDto, HutDto } from './hut.js'
import type { MetricDto } from './metric.js'
import type { MinerRecordDto } from './miner.js'
import type { SiteDetailDto, SiteDto } from './site.js'

/** GET /v1/sites */
export type SitesResponseDto = SiteDto[]

/** GET /v1/sites/:id */
export type SiteDetailResponseDto = SiteDetailDto

/** GET /v1/huts */
export type HutsResponseDto = HutDto[]

/** GET /v1/huts/:hutCode */
export type HutDetailResponseDto = HutDetailDto

/** GET /v1/huts/:hutCode/miners */
export type HutMinersResponseDto = {
  miners: MinerRecordDto[]
}

/** GET /v1/alerts/recent */
export type RecentAlertsResponseDto = AlertDto[]

/** GET /v1/sites/:siteId/devices or similar */
export type DevicesResponseDto = DeviceDto[]

/** GET /v1/sites/:siteId/devices/:deviceId/metrics or similar */
export type DeviceMetricsResponseDto = MetricDto[]
