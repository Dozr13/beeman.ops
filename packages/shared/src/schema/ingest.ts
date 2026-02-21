import { z } from 'zod'
import { DeviceKind } from './device.js'

export const IngestDevice = z.object({
  externalId: z.string().min(1),
  kind: DeviceKind,
  name: z.string().optional(),
  meta: z.record(z.any()).optional()
})
export type IngestDevice = z.infer<typeof IngestDevice>

export const IngestMetric = z.object({
  deviceExternalId: z.string().min(1),
  ts: z.string().datetime(),
  payload: z.record(z.any())
})
export type IngestMetric = z.infer<typeof IngestMetric>

export const IngestBatch = z
  .object({
    siteCode: z.string().min(1).optional(),
    hutCode: z.string().min(1).optional(),
    agentId: z.string().min(1),
    devices: z.array(IngestDevice).default([]),
    metrics: z.array(IngestMetric).min(1)
  })
  .superRefine((v, ctx) => {
    if (!v.siteCode && !v.hutCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either siteCode or hutCode is required'
      })
    }
  })
export type IngestBatch = z.infer<typeof IngestBatch>
