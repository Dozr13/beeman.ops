// packages/agent/src/collectors/hut/whatsminer.ts
import net from 'node:net'
import pLimit from 'p-limit'
import type { CollectorContext, CollectorResult } from '../../types.js'

const limit = pLimit(12)

const readJsonOnce = (
  host: string,
  port: number,
  payload: unknown,
  timeoutMs = 2000
) =>
  new Promise<any>((resolve, reject) => {
    const socket = new net.Socket()
    let buf = ''

    const done = (err?: Error, data?: any) => {
      socket.removeAllListeners()
      socket.destroy()
      if (err) reject(err)
      else resolve(data)
    }

    socket.setTimeout(timeoutMs)
    socket.on('timeout', () => done(new Error('timeout')))
    socket.on('error', (e) => done(e as Error))

    socket.connect(port, host, () => {
      socket.write(JSON.stringify(payload))
    })

    socket.on('data', (chunk) => {
      buf += chunk.toString('utf8')
      try {
        const parsed = JSON.parse(buf)
        done(undefined, parsed)
      } catch {
        // keep buffering until valid JSON
      }
    })
  })

const pickNum = (obj: any, key: string) => {
  const v = obj?.[key]
  return typeof v === 'number' ? v : null
}

export const collectWhatsMiner = async (
  ctx: CollectorContext
): Promise<CollectorResult> => {
  const targets = (ctx.config?.collectors?.hut?.miners?.targets ??
    []) as Array<{
    name?: string // A01, A02, ...
    host: string
    port?: number
  }>

  const ts = ctx.nowIso()

  const devices: CollectorResult['devices'] = []
  const metrics: CollectorResult['metrics'] = []

  await Promise.all(
    targets.map((t) =>
      limit(async () => {
        const host = t.host
        const port = t.port ?? 4028
        const loc = t.name ?? host

        const ts = ctx.nowIso()

        const hutCode = String((ctx.config as any)?.hutCode ?? '').trim()
        const prefix = hutCode || String(ctx.siteCode)

        // externalId format: GH180.A01 (preferred) or <siteCode>.A01 fallback
        const externalId = `${prefix}.${loc}`

        devices.push({
          externalId,
          kind: 'MINER',
          name: loc,
          meta: { host, port, loc }
        })

        try {
          const res = await readJsonOnce(host, port, { cmd: 'summary' })
          const s = res?.SUMMARY?.[0] ?? {}

          const mhs5s = pickNum(s, 'MHS 5s')
          const mhs1m = pickNum(s, 'MHS 1m')
          const mhsAv = pickNum(s, 'MHS av')

          const uptime = pickNum(s, 'Uptime')
          const accepted = pickNum(s, 'Accepted')
          const rejected = pickNum(s, 'Rejected')
          const power = pickNum(s, 'Power')
          const fanIn = pickNum(s, 'Fan Speed In')
          const fanOut = pickNum(s, 'Fan Speed Out')

          const tempAvg = pickNum(s, 'Chip Temp Avg')
          const tempMax = pickNum(s, 'Chip Temp Max')

          const errs: string[] = []
          if (tempMax != null && tempMax >= 85) errs.push('overheat')
          if (fanIn != null && fanIn <= 0) errs.push('fan_error')
          if (fanOut != null && fanOut <= 0) errs.push('fan_error')

          metrics.push({
            deviceExternalId: externalId,
            ts,
            payload: {
              ip: host,
              loc, // NEW: location label for UI
              reachable: true,
              api_4028: true,

              ghs_5s: mhs5s,
              ghs_1m: mhs1m,
              ghs_av: mhsAv,

              uptime_s: uptime,
              accepted,
              rejected,

              power_w: power,
              fan_in: fanIn,
              fan_out: fanOut,

              temp_avg: tempAvg,
              temp_max: tempMax,

              errors: errs.length ? errs : null,
              raw: res
            }
          })
        } catch (e: any) {
          metrics.push({
            deviceExternalId: externalId,
            ts,
            payload: {
              ip: host,
              loc, // NEW
              reachable: false,
              api_4028: false,
              errors: ['unreachable'],
              raw: { message: e?.message ?? String(e) }
            }
          })
        }
      })
    )
  )

  return { devices, metrics }
}
