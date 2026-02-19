import { z } from 'zod'

export const MetricPoint = z.object({
  ts: z.string().datetime(),
  payload: z.record(z.any())
})
export type MetricPoint = z.infer<typeof MetricPoint>

/** Query metric series (device + time range) */
export const MetricQuery = z.object({
  deviceId: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
  limit: z.number().int().min(1).max(5000).default(2000)
})
export type MetricQuery = z.infer<typeof MetricQuery>
