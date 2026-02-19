import type { FastifyInstance, FastifyRequest } from 'fastify'

export const requireReadKey = (req: FastifyRequest) => {
  const raw = req.headers['x-ops-read-key']
  if (!raw || Array.isArray(raw)) return false

  const key = String(raw).trim()
  const expected = String(process.env.OPS_READ_KEY ?? '').trim()
  if (!expected) return false

  return key === expected
}

// Per-site ingest key, with fallback to OPS_INGEST_KEY
export const requireIngestKey = async (
  app: FastifyInstance,
  req: FastifyRequest,
  siteCode: string
) => {
  const raw = req.headers['x-ops-key']
  if (!raw || Array.isArray(raw)) return false

  const key = String(raw).trim()
  if (!key) return false

  // 1) Prefer per-site ingestKey if the site exists
  const site = await app.prisma.site.findUnique({
    where: { code: siteCode },
    select: { ingestKey: true }
  })

  const siteKey = String(site?.ingestKey ?? '').trim()
  if (siteKey) return key === siteKey

  // 2) Fallback global key
  const expected = String(process.env.OPS_INGEST_KEY ?? '').trim()
  if (!expected) return false
  return key === expected
}
