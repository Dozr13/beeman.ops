import { AlertCreate } from '@ops/shared'
import type { FastifyPluginAsync } from 'fastify'
import { requireReadKey } from './_auth.js'

export const alertsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/sites/:siteId/alerts', async (req) => {
    const siteId = (req.params as any).siteId as string
    return app.prisma.alert.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
  })

  app.get('/alerts/recent', async () => {
    return app.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200
    })
  })

  // Create alerts (agent/worker uses this). Protected by ingest key.
  app.post('/alerts', async (req, reply) => {
    if (!requireReadKey(req))
      return reply.code(401).send({ error: 'unauthorized' })

    const parsed = AlertCreate.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten())

    const a = parsed.data
    const created = await app.prisma.alert.create({
      data: {
        siteId: a.siteId,
        deviceId: a.deviceId,
        severity: a.severity,
        code: a.code,
        message: a.message,
        details: a.details ?? undefined
      }
    })
    return created
  })

  // Resolve alert
  app.post('/alerts/:alertId/resolve', async (req, reply) => {
    if (!requireReadKey(req))
      return reply.code(401).send({ error: 'unauthorized' })

    const alertId = (req.params as any).alertId as string
    const updated = await app.prisma.alert.update({
      where: { id: alertId },
      data: { resolvedAt: new Date() }
    })
    return updated
  })
}
