import { z } from 'zod'

export const Severity = z.enum(['INFO', 'WARN', 'HIGH', 'CRITICAL'])
export type Severity = z.infer<typeof Severity>

/** Alert create payload */
export const AlertCreate = z.object({
  siteId: z.string().min(1),
  deviceId: z.string().optional(),
  severity: Severity,
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.any()).optional()
})
export type AlertCreate = z.infer<typeof AlertCreate>
