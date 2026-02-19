import type { DeviceKind } from '../schema/device.js'

export type DeviceDto = {
  id: string
  siteId: string | null
  externalId: string | null
  kind: DeviceKind
  name: string | null
  meta: any
  createdAt?: string
  lastHeartbeat?: string | null
  lastSeen?: string | null
}
