// packages/api/src/routes/metrics.ts
import { MetricQuery } from '@ops/shared'
import { Metric } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  // Query metric series for a device
  app.post('/metrics/query', async (req, reply) => {
    const parsed = MetricQuery.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten())

    const { deviceId, from, to, limit } = parsed.data

    const exists = await app.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true }
    })
    if (!exists) return reply.code(404).send({ error: 'device_not_found' })

    const rows = await app.prisma.metric.findMany({
      where: {
        deviceId,
        ts: { gte: new Date(from), lte: new Date(to) }
      },
      orderBy: { ts: 'asc' },
      take: limit
    })

    return rows.map((r: Metric) => ({
      ts: r.ts.toISOString(),
      payload: r.payload
    }))
  })

  // Quick latest N metrics
  app.get('/devices/:deviceId/metrics/latest', async (req, reply) => {
    const deviceId = (req.params as any).deviceId as string
    const limit = Math.min(
      200,
      Math.max(1, Number((req.query as any).limit ?? 50))
    )

    const exists = await app.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true }
    })
    if (!exists) return reply.code(404).send({ error: 'device_not_found' })

    const rows = await app.prisma.metric.findMany({
      where: { deviceId },
      orderBy: { ts: 'desc' },
      take: limit
    })

    rows.reverse()

    return rows.map((r: Metric) => ({
      ts: r.ts.toISOString(),
      payload: r.payload
    }))
  })
}
