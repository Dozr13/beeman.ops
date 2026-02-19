// packages/api/src/routes/devices.ts
import type { FastifyPluginAsync } from 'fastify'

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  // Device detail
  app.get('/devices/:deviceId', async (req, reply) => {
    const deviceId = (req.params as any).deviceId as string
    const dev = await app.prisma.device.findUnique({ where: { id: deviceId } })
    if (!dev) return reply.code(404).send({ error: 'not_found' })
    return dev
  })
}
