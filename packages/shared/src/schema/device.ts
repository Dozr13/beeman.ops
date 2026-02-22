import { z } from 'zod'

/** Canonical device categories */
export const DeviceKind = z.enum([
  'AGENT',
  'MINER',
  'SWITCH',
  'ROUTER',
  'STARLINK',
  'RTU',
  'PLC',
  'HMI',
  'SENSOR',
  'TANK',
  'PRESSURE',
  'TEMPERATURE',
  // NEW: vendor daily reports / flow metering
  'GAS_METER'
])
export type DeviceKind = z.infer<typeof DeviceKind>
