// packages/api/src/routes/sites.ts
import { SiteType } from '@ops/shared'
import type { FastifyPluginAsync } from 'fastify'

type SiteCreateBody = {
  code: string
  name?: string | null
  // UPDATED: Site type now represents LOCATION kind (not hut vs well)
  type?: SiteType
  timezone?: string
  hutCode?: string | null
  meta?: any
  ingestKey?: string | null

  // Optional geo helpers (stored in Site.meta.geo)
  geo?: { lat: number; lng: number } | null
  lat?: number | string | null
  lon?: number | string | null
  lng?: number | string | null
}

type SitePatchBody = Partial<SiteCreateBody>

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

const toNumOrNull = (v: any): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

const pickExampleData = (meta: any) => {
  const ex = meta?.exampleData
  if (!ex || typeof ex !== 'object') return null

  const rangeStart = typeof ex.rangeStart === 'string' ? ex.rangeStart : null
  const rangeEnd = typeof ex.rangeEnd === 'string' ? ex.rangeEnd : null
  if (!rangeStart || !rangeEnd) return null

  return {
    rangeStart,
    rangeEnd,
    note: typeof ex.note === 'string' ? ex.note : undefined,
    sourceFile: typeof ex.sourceFile === 'string' ? ex.sourceFile : undefined,
    sheet: typeof ex.sheet === 'string' ? ex.sheet : undefined
  }
}

const buildDailyGas = (
  gasDevices: Array<{
    id: string
    externalId: string
    metrics: Array<{ ts: Date; payload: any }>
  }>
) => {
  const meters = gasDevices
    .map((d) => {
      const m = d.metrics[0]
      if (!m) return null
      const p = m.payload ?? {}
      const date =
        typeof p.date === 'string' ? p.date : m.ts.toISOString().slice(0, 10)
      return {
        deviceId: d.id,
        externalId: d.externalId,
        ts: m.ts.toISOString(),
        date,
        temp_f: toNumOrNull(p.temp_f),
        dp_inh2o: toNumOrNull(p.dp_inh2o),
        lp_psi: toNumOrNull(p.lp_psi),
        flow_hrs: toNumOrNull(p.flow_hrs),
        vol_mcf: toNumOrNull(p.vol_mcf),
        mmbtu: toNumOrNull(p.mmbtu),
        raw: p
      }
    })
    .filter(Boolean) as any[]

  if (meters.length === 0) return null

  // pick the most recent metric timestamp across meters
  meters.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
  const latestTs = meters[0].ts
  const latestDate = meters[0].date

  // Totals across meters (same latestDate is expected in daily reports)
  const sum = (key: 'vol_mcf' | 'mmbtu' | 'flow_hrs') => {
    const vals = meters
      .filter((m) => m.date === latestDate)
      .map((m) => m[key])
      .filter((v: any) => typeof v === 'number' && Number.isFinite(v))
    if (vals.length === 0) return null
    return vals.reduce((a: number, b: number) => a + b, 0)
  }

  return {
    date: latestDate,
    ts: latestTs,
    totals: {
      vol_mcf: sum('vol_mcf'),
      mmbtu: sum('mmbtu'),
      flow_hrs: sum('flow_hrs')
    },
    meters
  }
}

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
        },
        // NEW: gas meter latest daily metric (from XLSX imports)
        devices: {
          where: { kind: 'GAS_METER' },
          select: {
            id: true,
            externalId: true,
            metrics: {
              take: 1,
              orderBy: { ts: 'desc' },
              select: { ts: true, payload: true }
            }
          }
        }
      }
    })

    return sites.map((s) => {
      const exampleData = pickExampleData(s.meta)
      const dailyGas = buildDailyGas(s.devices as any)

      // NOTE: we do NOT mutate db meta; we just return a meta copy with derived production fields
      const meta = s.meta ?? null
      const metaOut =
        meta && typeof meta === 'object' ? { ...(meta as any) } : meta

      if (dailyGas?.totals?.vol_mcf != null) {
        metaOut.production = {
          ...(metaOut.production ?? {}),
          // UI already reads meta.production.gasMcfpd
          gasMcfpd: dailyGas.totals.vol_mcf
        }
      }

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        type: s.type,
        timezone: s.timezone,
        meta: metaOut,
        hutCode: s.hutCode,
        createdAt: s.createdAt,
        lastHeartbeat: iso(s.heartbeats[0]?.ts),
        // NEW: current hut if assigned
        currentHut: s.hutAssignments[0]?.hut ?? null,
        // NEW: example/banner + latest daily gas for this site
        exampleData,
        dailyGas
      }
    })
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
        },
        devices: {
          where: { kind: 'GAS_METER' },
          select: {
            id: true,
            externalId: true,
            name: true,
            meta: true,
            metrics: {
              take: 1,
              orderBy: { ts: 'desc' },
              select: { ts: true, payload: true }
            }
          }
        }
      }
    })

    if (!s) return null

    const exampleData = pickExampleData(s.meta)
    const dailyGas = buildDailyGas(s.devices as any)

    const meta = s.meta ?? null
    const metaOut =
      meta && typeof meta === 'object' ? { ...(meta as any) } : meta
    if (dailyGas?.totals?.vol_mcf != null) {
      metaOut.production = {
        ...(metaOut.production ?? {}),
        gasMcfpd: dailyGas.totals.vol_mcf
      }
    }

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      type: s.type,
      timezone: s.timezone,
      meta: metaOut,
      hutCode: s.hutCode,
      ingestKey: s.ingestKey,
      createdAt: s.createdAt,
      lastHeartbeat: iso(s.heartbeats[0]?.ts),
      // NEW: current hut if assigned
      currentHut: s.hutAssignments[0]?.hut ?? null,
      // NEW: example/banner + latest daily gas for this site
      exampleData,
      dailyGas,
      // optional: expose gas devices for device pages
      gasMeters: (s.devices ?? []).map((d: any) => ({
        id: d.id,
        externalId: d.externalId,
        name: d.name ?? null,
        meta: d.meta ?? null,
        latest: d.metrics?.[0]
          ? {
              ts: d.metrics[0].ts.toISOString(),
              payload: d.metrics[0].payload
            }
          : null
      }))
    }
  })

  // Daily gas time-series (for charts)
  // Aggregates GAS_METER metrics across a site.
  // Query: ?days=30 (default 30, max 365)
  app.get('/sites/:siteId/gas-series', async (req) => {
    const { siteId } = req.params as { siteId: string }
    const q = req.query as any

    const daysRaw = typeof q?.days === 'string' ? q.days : undefined
    const daysNum = daysRaw ? Number(daysRaw) : 30
    const days = Number.isFinite(daysNum)
      ? Math.min(Math.max(Math.floor(daysNum), 1), 365)
      : 30

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const devices = await app.prisma.device.findMany({
      where: { siteId, kind: 'GAS_METER' },
      select: { id: true }
    })

    if (devices.length === 0) {
      return { siteId, days, points: [] }
    }

    const deviceIds = devices.map((d) => d.id)

    // Low volume daily reports -> aggregate in JS.
    const metrics = await app.prisma.metric.findMany({
      where: {
        deviceId: { in: deviceIds },
        ts: { gte: since }
      },
      orderBy: { ts: 'asc' },
      select: {
        ts: true,
        payload: true
      }
    })

    const add = (a: number | null, b: unknown) => {
      const aa = typeof a === 'number' && Number.isFinite(a) ? a : null
      const bb = typeof b === 'number' && Number.isFinite(b) ? b : null
      if (aa === null && bb === null) return null
      return (aa ?? 0) + (bb ?? 0)
    }

    const isoDay = (d: Date) => d.toISOString().slice(0, 10)
    const byDay = new Map<
      string,
      { vol_mcf: number | null; mmbtu: number | null; flow_hrs: number | null }
    >()

    for (const m of metrics) {
      const p: any = m.payload ?? {}
      const day =
        typeof p.date === 'string' && p.date.length >= 10
          ? p.date.slice(0, 10)
          : isoDay(m.ts)

      const cur = byDay.get(day) ?? {
        vol_mcf: null,
        mmbtu: null,
        flow_hrs: null
      }
      byDay.set(day, {
        vol_mcf: add(cur.vol_mcf, p.vol_mcf),
        mmbtu: add(cur.mmbtu, p.mmbtu),
        flow_hrs: add(cur.flow_hrs, p.flow_hrs)
      })
    }

    const points = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, t]) => ({
        date,
        ts: new Date(`${date}T00:00:00.000Z`).toISOString(),
        ...t
      }))

    return { siteId, days, points }
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
      return reply.code(400).send({ error: 'delete_failed' })
    }
  })
}
