import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// packages/api/src -> packages/api -> packages -> repo root
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true
})

import cors from '@fastify/cors'
import { getPrisma } from '@ops/db'
import Fastify from 'fastify'
import { startMetricRollups } from './jobs/rollupMetrics.js'
import { routes } from './routes/index.js'

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })

const prisma = getPrisma()
app.decorate('prisma', prisma)

await app.register(routes, { prefix: '/v1' })

// NEW: start rollups after prisma + routes exist
startMetricRollups(app)

app.get('/health', async () => ({ ok: true }))

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3002)
const host = process.env.HOST ?? '0.0.0.0'
await app.listen({ port, host })
