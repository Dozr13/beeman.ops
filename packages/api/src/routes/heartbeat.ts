// packages/api/src/routes/heartbeat.ts
import { HeartbeatBody } from '@ops/shared'
import type { FastifyInstance } from 'fastify'
import { requireIngestKey } from './_auth.js'

export const registerHeartbeatRoutes = async (app: FastifyInstance) => {
  app.post('/v1/heartbeat', async (req, reply) => {
    const parsed = HeartbeatBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten())

    const body = parsed.data

    if (!(await requireIngestKey(app, req, body.siteCode))) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    const site = await app.prisma.site.upsert({
      where: { code: body.siteCode },
      create: {
        code: body.siteCode,
        type: 'UNKNOWN',
        timezone: 'America/Denver'
      },
      update: {}
    })

    await app.prisma.heartbeat.create({
      data: {
        siteId: site.id,
        ts: new Date(body.ts),
        agentId: body.agentId,
        meta: body.meta ?? undefined
      }
    })

    return reply.send({ ok: true })
  })
}
