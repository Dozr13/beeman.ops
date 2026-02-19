// packages/api/src/routes/sites.ts
import type { FastifyPluginAsync } from 'fastify'

type SiteCreateBody = {
  code: string
  name?: string | null
  // UPDATED: Site type now represents LOCATION kind (not hut vs well)
  type?: 'UNKNOWN' | 'WELL' | 'PAD' | 'FACILITY' | 'YARD'
  timezone?: string
  hutCode?: string | null
  meta?: any
  ingestKey?: string | null
}

type SitePatchBody = Partial<SiteCreateBody>

export const sitesRoutes: FastifyPluginAsync = async (app) => {
  // List sites (public to the web app; auth can be added later)
  app.get('/sites', async () => {
    const sites = await app.prisma.site.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        timezone: true,
        meta: true,
        hutCode: true,
        createdAt: true,
        heartbeats: {
          select: { ts: true },
          orderBy: { ts: 'desc' },
          take: 1
        },
        // NEW: include current hut assignment for this site (endsAt null)
        hutAssignments: {
          where: { endsAt: null },
          take: 1,
          orderBy: { startsAt: 'desc' },
          select: {
            hut: { select: { id: true, code: true, name: true } }
          }
        }
      }
    })

    return sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      type: s.type,
      timezone: s.timezone,
      meta: s.meta,
      hutCode: s.hutCode,
      createdAt: s.createdAt,
      lastHeartbeat:
        s.heartbeats[0]?.ts?.toISOString?.() ?? s.heartbeats[0]?.ts ?? null,
      // NEW: current hut if assigned
      currentHut: s.hutAssignments[0]?.hut ?? null
    }))
  })

  // Get one site
  app.get('/sites/:id', async (req) => {
    const { id } = req.params as { id: string }

    const s = await app.prisma.site.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        timezone: true,
        meta: true,
        hutCode: true,
        ingestKey: true,
        createdAt: true,
        heartbeats: {
          select: { ts: true },
          orderBy: { ts: 'desc' },
          take: 1
        },
        // NEW: current hut assignment for this site (endsAt null)
        hutAssignments: {
          where: { endsAt: null },
          take: 1,
          orderBy: { startsAt: 'desc' },
          select: {
            hut: { select: { id: true, code: true, name: true } }
          }
        }
      }
    })

    if (!s) return null

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      type: s.type,
      timezone: s.timezone,
      meta: s.meta,
      hutCode: s.hutCode,
      ingestKey: s.ingestKey,
      createdAt: s.createdAt,
      lastHeartbeat:
        s.heartbeats[0]?.ts?.toISOString?.() ?? s.heartbeats[0]?.ts ?? null,
      // NEW: current hut if assigned
      currentHut: s.hutAssignments[0]?.hut ?? null
    }
  })

  // Devices for a site (accepts site id OR site code)
  app.get('/sites/:siteKey/devices', async (req, reply) => {
    const { siteKey } = req.params as { siteKey: string }

    const site = await app.prisma.site.findFirst({
      where: { OR: [{ id: siteKey }, { code: siteKey }] },
      select: { id: true }
    })

    if (!site) return reply.code(404).send({ error: 'site_not_found' })

    return app.prisma.device.findMany({
      where: { siteId: site.id },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        siteId: true,
        externalId: true,
        kind: true,
        name: true,
        meta: true,
        createdAt: true
      }
    })
  })

  // Create site (simple; you can lock this down later)
  app.post('/sites', async (req, reply) => {
    const body = (req.body ?? {}) as SiteCreateBody

    if (!body.code || !String(body.code).trim()) {
      return reply.code(400).send({ error: 'code_required' })
    }

    const code = String(body.code).trim()

    const created = await app.prisma.site.create({
      data: {
        code,
        name: body.name ?? null,
        // UPDATED: default to UNKNOWN if not provided
        type: (body.type as any) ?? 'UNKNOWN',
        timezone: body.timezone ?? 'America/Denver',
        hutCode: body.hutCode ?? null,
        meta: body.meta ?? undefined,
        ingestKey: body.ingestKey ?? null
      }
    })

    return { ok: true, id: created.id }
  })

  // Patch site (edit)
  app.patch('/sites/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as SitePatchBody

    const data: any = {}

    if (body.code !== undefined) data.code = String(body.code).trim()
    if (body.name !== undefined) data.name = body.name
    if (body.type !== undefined) data.type = body.type as any
    if (body.timezone !== undefined) data.timezone = body.timezone
    if (body.hutCode !== undefined) data.hutCode = body.hutCode
    if (body.meta !== undefined) data.meta = body.meta ?? undefined
    if (body.ingestKey !== undefined) data.ingestKey = body.ingestKey

    await app.prisma.site.update({
      where: { id },
      data
    })

    return { ok: true }
  })

  // DELETE site (safe: will fail if FK restrict elsewhere; assignments cascade)
  app.delete('/sites/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      await app.prisma.site.delete({ where: { id } })
      return reply.send({ ok: true })
    } catch (e: any) {
      // Keep it predictable
      return reply.code(400).send({
        error: 'delete_failed',
        message: String(e?.message ?? e)
      })
    }
  })
}
