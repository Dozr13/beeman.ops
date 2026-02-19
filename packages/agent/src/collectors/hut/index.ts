import type { CollectorContext, CollectorResult } from '../../types.js'
import { collectMockMiners } from './mockMiners.js'
import { collectWhatsMiner } from './whatsminer.js'

export const collectHut = async (
  ctx: CollectorContext
): Promise<CollectorResult> => {
  const out: CollectorResult = { devices: [], metrics: [] }

  const minersEnabled = Boolean(ctx.config?.collectors?.hut?.miners?.enabled)
  if (minersEnabled) {
    const r = await collectWhatsMiner(ctx)
    out.devices.push(...r.devices)
    out.metrics.push(...r.metrics)
  }

  const mockMinersEnabled = Boolean(
    ctx.config?.collectors?.hut?.mockMiners?.enabled
  )
  if (mockMinersEnabled) {
    const r = await collectMockMiners(ctx)
    out.devices.push(...r.devices)
    out.metrics.push(...r.metrics)
  }

  // Future: SNMP for Juniper, router health, starlink stats, etc.
  return out
}
