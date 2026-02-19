import type { CollectorContext, CollectorResult } from '../../types.js'

/**
 * Generates a stable fleet of fake miners so the dashboard looks real
 * even before wiring WhatsMiner/Braiins/etc.
 *
 * - Deterministic per siteCode (same miners each run)
 * - Hashrate/temps drift slightly over time
 * - Occasionally injects a "faulty" miner
 */
export const collectMockMiners = async (
  ctx: CollectorContext
): Promise<CollectorResult> => {
  const enabled = Boolean(ctx.config?.hut?.mockMiners?.enabled ?? true)
  if (!enabled) return { devices: [], metrics: [] }

  const count = Number(ctx.config?.hut?.mockMiners?.count ?? 48)

  // deterministic-ish seed from siteCode
  const seedBase = Array.from(ctx.siteCode).reduce(
    (a, c) => a + c.charCodeAt(0),
    0
  )

  const now = Date.now()
  const t = now / 1000

  const devices: CollectorResult['devices'] = []
  const metrics: CollectorResult['metrics'] = []

  // Every ~10 minutes, pick one miner to be "problem child"
  const troubleIndex = Math.floor((t / 600 + seedBase) % count)

  for (let i = 1; i <= count; i++) {
    const id = `mock:${ctx.siteCode}:m${String(i).padStart(2, '0')}`
    const name = `M${String(i).padStart(2, '0')}`

    devices.push({
      externalId: id,
      kind: 'MINER',
      name,
      meta: {
        model: 'WhatsMiner M30S (mock)',
        ip: `10.0.${Math.floor(i / 255)}.${i % 255 || 1}`,
        source: 'mockMiners'
      }
    })

    // baseline values
    const baseHashTh = 100 + ((seedBase + i) % 25) // 100–124 TH/s
    const drift = Math.sin(t / 30 + i) * 2 // gentle drift
    const fan = 5200 + Math.floor((Math.sin(t / 20 + i) + 1) * 800)

    let hashTh = baseHashTh + drift
    let tempC = 68 + (Math.sin(t / 45 + i) + 1) * 6 // ~68–80C
    let status: 'OK' | 'WARN' | 'DOWN' = 'OK'

    // Inject a fault sometimes
    if (i - 1 === troubleIndex) {
      const phase = (t / 60) % 10
      if (phase < 3) {
        status = 'WARN'
        tempC += 12
        hashTh -= 15
      } else if (phase < 4) {
        status = 'DOWN'
        hashTh = 0
        tempC = 0
      }
    }

    metrics.push({
      deviceExternalId: id,
      ts: ctx.nowIso(),
      payload: {
        status,
        hashrate_ths: Number(hashTh.toFixed(2)),
        temp_c: Number(tempC.toFixed(1)),
        fan_rpm: fan,
        power_w: status === 'DOWN' ? 0 : 3200 + ((seedBase + i) % 300),
        pool: 'braiins (mock)'
      }
    })
  }

  ctx.log(
    `mockMiners: generated ${count} miners (troubleIndex=${troubleIndex + 1})`
  )
  return { devices, metrics }
}
