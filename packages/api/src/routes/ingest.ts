// packages/api/src/routes/ingest.ts
import { IngestBatch } from '@ops/shared'
import type { FastifyPluginAsync } from 'fastify'
import { requireIngestKey } from './_auth.js'

let lastRetentionAt = 0
const RETENTION_EVERY_MS = 15 * 60 * 1000 // 15 minutes

type JsonObj = Record<string, any>
const asObj = (v: unknown): JsonObj =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : {}

type ResolveOk = { siteId: string; siteCode: string }
type ResolveErr = { status: number; body: any }
type ResolveResult = ResolveOk | { error: ResolveErr }

const resolveSite = async (
  app: any,
  input: { siteCode?: string; hutCode?: string }
): Promise<ResolveResult> => {
  const hutCode = (input.hutCode ?? '').trim()
  const siteCode = (input.siteCode ?? '').trim()

  if (hutCode) {
    const hut = await app.prisma.hut.findUnique({
      where: { code: hutCode },
      select: { id: true }
    })
    if (!hut)
      return { error: { status: 404, body: { error: 'hut_not_found' } } }

    const asg = await app.prisma.hutAssignment.findFirst({
      where: { hutId: hut.id, endsAt: null },
      select: { site: { select: { id: true, code: true } } }
    })
    if (!asg)
      return { error: { status: 409, body: { error: 'hut_unassigned' } } }

    return { siteId: asg.site.id, siteCode: asg.site.code }
  }

  if (!siteCode)
    return {
      error: { status: 400, body: { error: 'siteCode_or_hutCode_required' } }
    }

  const site = await app.prisma.site.upsert({
    where: { code: siteCode },
    update: {},
    create: { code: siteCode, type: 'UNKNOWN', timezone: 'America/Denver' }
  })

  return { siteId: site.id, siteCode: site.code }
}

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
  app.post('/ingest', async (req, reply) => {
    const parsed = IngestBatch.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten())

    const body = parsed.data as any
    const devices = body.devices ?? []
    const metrics = body.metrics ?? []

    const resolved = await resolveSite(app, {
      siteCode: body.siteCode,
      hutCode: body.hutCode
    })
    if ('error' in resolved) {
      return reply.code(resolved.error.status).send(resolved.error.body)
    }

    const { siteId, siteCode } = resolved

    if (!(await requireIngestKey(app, req, siteCode))) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    // IMPORTANT: use resolved siteId
    const site = { id: siteId }

    // ✅ NEW: prefetch existing device meta so we can MERGE instead of clobber
    const incomingExternalIds = Array.from(
      new Set((devices as any[]).map((d: any) => d.externalId).filter(Boolean))
    ) as string[]

    const existing = await app.prisma.device.findMany({
      where: { siteId: site.id, externalId: { in: incomingExternalIds } },
      select: { id: true, externalId: true, meta: true }
    })

    const existingMetaByExternalId = new Map(
      existing.map((d: any) => [d.externalId as string, d.meta])
    )

    for (const d of devices as any[]) {
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
      new Set(
        (metrics as any[]).map((m: any) => m.deviceExternalId).filter(Boolean)
      )
    ) as string[]

    const devs = await app.prisma.device.findMany({
      where: { siteId: site.id, externalId: { in: externalIds } },
      select: { id: true, externalId: true }
    })

    const map = new Map(
      devs.map((d: any) => [d.externalId as string, d.id as string])
    )

    for (const m of metrics as any[]) {
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

    return reply.send({ ok: true, ingested: (metrics as any[]).length })
  })
}
