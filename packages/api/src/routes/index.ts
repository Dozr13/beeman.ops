import type { FastifyPluginAsync } from 'fastify'
import { alertsRoutes } from './alerts.js'
import { devicesRoutes } from './devices.js'
import { heartbeatRoutes } from './heartbeat.js'
import { hutsRoutes } from './huts.js'
import { ingestRoutes } from './ingest.js'
import { metricsRoutes } from './metrics.js'
import { sitesRoutes } from './sites.js'

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(ingestRoutes)
  await app.register(sitesRoutes)
  await app.register(devicesRoutes)
  await app.register(metricsRoutes)
  await app.register(alertsRoutes)
  await app.register(hutsRoutes)
  await app.register(heartbeatRoutes)
}
