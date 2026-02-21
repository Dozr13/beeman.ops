import { z } from 'zod'

/**
 * Site "location kind" (NOT device type)
 * This replaces the old HASHHUT/WELLSITE idea.
 */
export const SiteType = z.enum(['UNKNOWN', 'WELL', 'PAD', 'FACILITY', 'YARD'])
export type SiteType = z.infer<typeof SiteType>

/**
 * Agent heartbeat
 * - siteCode: stable site key (you’re using lat,long — fine)
 * - siteType: location kind
 * - agentId: the agent identity (e.g. bulldog-26)
 */
export const HeartbeatBody = z
  .object({
    siteCode: z.string().min(1).optional(),
    hutCode: z.string().min(1).optional(),
    agentId: z.string().min(1),
    ts: z.string().datetime(),
    siteType: SiteType.optional().default('UNKNOWN'),
    meta: z.record(z.any()).optional()
  })
  .superRefine((v, ctx) => {
    if (!v.siteCode && !v.hutCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either siteCode or hutCode is required'
      })
    }
  })
export type HeartbeatBody = z.infer<typeof HeartbeatBody>
