import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '../../..')
const envLocalPath = path.join(repoRoot, '.env.local')
const envPath = path.join(repoRoot, '.env')

// In production (Render/Vercel), env vars are injected.
// Locally, prefer .env.local, fallback to .env.
if (!process.env.RENDER && !process.env.VERCEL) {
  const picked = fs.existsSync(envLocalPath) ? envLocalPath : envPath
  if (fs.existsSync(picked)) {
    dotenv.config({ path: picked, override: false })
  }
}

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
