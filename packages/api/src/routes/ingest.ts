// packages/api/src/routes/ingest.ts
import { HeartbeatBody, IngestBatch } from '@ops/shared'
import type { FastifyPluginAsync } from 'fastify'
import { requireIngestKey } from './_auth.js'

let lastRetentionAt = 0
const RETENTION_EVERY_MS = 15 * 60 * 1000 // 15 minutes

type JsonObj = Record<string, any>
const asObj = (v: unknown): JsonObj =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : {}

const mergeMetaPreserveLoc = (existing: unknown, incoming: unknown) => {
  const e = asObj(existing)
  const i = asObj(incoming)

  // Merge, but preserve loc unless incoming explicitly provides it
  const merged: JsonObj = { ...e, ...i }

  const incomingHasLoc =
    Object.prototype.hasOwnProperty.call(i, 'loc') &&
    i.loc != null &&
    i.loc !== ''

  if (!incomingHasLoc) {
    if (e.loc != null && e.loc !== '') merged.loc = e.loc
    else if (merged.loc === '') delete merged.loc
  }

  return merged
}

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.post('/heartbeat', async (req, reply) => {
    const parsed = HeartbeatBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten())

    const { siteCode, agentId, ts, meta } = parsed.data

    if (!(await requireIngestKey(app, req, siteCode))) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    const site = await app.prisma.site.upsert({
      where: { code: siteCode },
      update: {},
      create: { code: siteCode, type: 'UNKNOWN', timezone: 'America/Denver' }
    })

    await app.prisma.heartbeat.create({
      data: {
        siteId: site.id,
        agentId,
        ts: new Date(ts),
        meta: meta ?? undefined
      }
    })

    return { ok: true }
  })

  app.post('/ingest', async (req, reply) => {
    const parsed = IngestBatch.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten())

    const { siteCode, devices, metrics } = parsed.data

    if (!(await requireIngestKey(app, req, siteCode))) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    const site = await app.prisma.site.upsert({
      where: { code: siteCode },
      update: {},
      create: { code: siteCode, type: 'UNKNOWN', timezone: 'America/Denver' }
    })

    // ✅ NEW: prefetch existing device meta so we can MERGE instead of clobber
    const incomingExternalIds = Array.from(
      new Set(devices.map((d) => d.externalId))
    )

    const existing = await app.prisma.device.findMany({
      where: { siteId: site.id, externalId: { in: incomingExternalIds } },
      select: { id: true, externalId: true, meta: true }
    })

    const existingMetaByExternalId = new Map(
      existing.map((d) => [d.externalId, d.meta])
    )

    for (const d of devices) {
      const existingMeta = existingMetaByExternalId.get(d.externalId)
      const mergedMeta = mergeMetaPreserveLoc(existingMeta, d.meta)

      await app.prisma.device.upsert({
        where: {
          siteId_externalId: { siteId: site.id, externalId: d.externalId }
        },
        update: {
          kind: d.kind,
          name: d.name,
          // ✅ changed: merge meta + preserve loc
          meta: mergedMeta
        },
        create: {
          siteId: site.id,
          externalId: d.externalId,
          kind: d.kind,
          name: d.name,
          meta: d.meta ?? undefined
        }
      })
    }

    const externalIds = Array.from(
      new Set(metrics.map((m) => m.deviceExternalId))
    )

    const devs = await app.prisma.device.findMany({
      where: { siteId: site.id, externalId: { in: externalIds } },
      select: { id: true, externalId: true }
    })

    const map = new Map(devs.map((d) => [d.externalId, d.id]))

    for (const m of metrics) {
      const deviceId = map.get(m.deviceExternalId)
      if (!deviceId) continue

      const ts = new Date(m.ts)

      await app.prisma.metric.create({
        data: { deviceId, ts, payload: m.payload }
      })

      await app.prisma.deviceStatus.upsert({
        where: { deviceId },
        update: { ts, payload: m.payload },
        create: { deviceId, ts, payload: m.payload }
      })
    }

    const now = Date.now()
    if (now - lastRetentionAt > RETENTION_EVERY_MS) {
      lastRetentionAt = now

      await app.prisma.metric.deleteMany({
        where: { ts: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      })

      await app.prisma.metricHour.deleteMany({
        where: { hour: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
      })
    }

    return { ok: true, ingested: metrics.length }
  })
}
