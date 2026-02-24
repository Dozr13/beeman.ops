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

// HELPERS- MOVE THESE
const asObj = (v: any): Record<string, any> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null

type GeoValue = { lat: number; lng: number }
type GeoParse =
  | { ok: true; change: GeoValue | null | undefined }
  | { ok: false; error: 'geo_invalid' | 'geo_lat_range' | 'geo_lng_range' }

const parseGeoChange = (body: SiteCreateBody | SitePatchBody): GeoParse => {
  // undefined => "no change requested"
  // null => "clear geo"
  // {lat,lng} => "set geo"

  if ((body as any).geo !== undefined) {
    const g = (body as any).geo

    if (g === null) return { ok: true, change: null }

    const obj = asObj(g)
    if (!obj) return { ok: false, error: 'geo_invalid' }

    const lat = toNumOrNull((obj as any).lat)
    const lng = toNumOrNull((obj as any).lng)

    if (lat == null || lng == null) return { ok: false, error: 'geo_invalid' }
    if (lat < -90 || lat > 90) return { ok: false, error: 'geo_lat_range' }
    if (lng < -180 || lng > 180) return { ok: false, error: 'geo_lng_range' }

    return { ok: true, change: { lat, lng } }
  }

  // Support legacy lat/lon/lng fields too, if present
  const hasAny =
    (body as any).lat !== undefined ||
    (body as any).lon !== undefined ||
    (body as any).lng !== undefined

  if (!hasAny) return { ok: true, change: undefined }

  const lat = toNumOrNull((body as any).lat)
  const lng = toNumOrNull((body as any).lng ?? (body as any).lon)

  if (lat == null || lng == null) return { ok: false, error: 'geo_invalid' }
  if (lat < -90 || lat > 90) return { ok: false, error: 'geo_lat_range' }
  if (lng < -180 || lng > 180) return { ok: false, error: 'geo_lng_range' }

  return { ok: true, change: { lat, lng } }
}

const mergeMetaGeo = (
  baseMeta: any,
  geoChange: { lat: number; lng: number } | null | undefined
) => {
  // undefined => leave meta untouched
  // null => remove geo key
  // object => set geo

  const base = asObj(baseMeta) ? { ...(baseMeta as any) } : {}

  if (geoChange === undefined) return baseMeta ?? base // keep original shape if possible
  if (geoChange === null) {
    delete (base as any).geo
    return base
  }

  ;(base as any).geo = geoChange
  return base
}

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

const buildDailyGasHistory = (
  rows: Array<{ deviceId: string; ts: Date; payload: any }>
) => {
  // rows are expected newest-first
  const byDeviceDate = new Map<
    string,
    { date: string; deviceId: string; payload: any }
  >()

  for (const r of rows) {
    const p = r.payload ?? {}
    const date =
      typeof p.date === 'string' ? p.date : r.ts.toISOString().slice(0, 10)
    const key = `${r.deviceId}::${date}`
    if (byDeviceDate.has(key)) continue
    byDeviceDate.set(key, { date, deviceId: r.deviceId, payload: p })
  }

  const byDate = new Map<
    string,
    {
      date: string
      vol_mcf: number | null
      mmbtu: number | null
      flow_hrs: number | null
    }
  >()

  for (const v of byDeviceDate.values()) {
    const cur = byDate.get(v.date) ?? {
      date: v.date,
      vol_mcf: 0,
      mmbtu: 0,
      flow_hrs: 0
    }

    const add = (key: 'vol_mcf' | 'mmbtu' | 'flow_hrs') => {
      const n = toNumOrNull(v.payload?.[key])
      if (n == null) return
      ;(cur as any)[key] = ((cur as any)[key] ?? 0) + n
    }

    add('vol_mcf')
    add('mmbtu')
    add('flow_hrs')

    byDate.set(v.date, cur)
  }

  const out = Array.from(byDate.values())
    .map((d) => ({
      date: d.date,
      vol_mcf:
        typeof d.vol_mcf === 'number' && Number.isFinite(d.vol_mcf)
          ? d.vol_mcf
          : null,
      mmbtu:
        typeof d.mmbtu === 'number' && Number.isFinite(d.mmbtu)
          ? d.mmbtu
          : null,
      flow_hrs:
        typeof d.flow_hrs === 'number' && Number.isFinite(d.flow_hrs)
          ? d.flow_hrs
          : null
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return out
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

  // Daily production history for graphs (aggregated across GAS_METER devices)
  app.get('/sites/:siteKey/production/daily', async (req, reply) => {
    const { siteKey } = req.params as { siteKey: string }
    const daysRaw = (req.query as any)?.days
    const days = Math.min(365, Math.max(1, Number(daysRaw ?? 30) || 30))

    const site = await app.prisma.site.findFirst({
      where: { OR: [{ id: siteKey }, { code: siteKey }] },
      select: { id: true }
    })
    if (!site) return reply.code(404).send({ error: 'site_not_found' })

    const gasDevices = await app.prisma.device.findMany({
      where: { siteId: site.id, kind: 'GAS_METER' },
      select: { id: true }
    })
    const deviceIds = gasDevices.map((d) => d.id)
    if (!deviceIds.length) return reply.send([])

    const now = new Date()
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const rows = await app.prisma.metric.findMany({
      where: { deviceId: { in: deviceIds }, ts: { gte: since } },
      orderBy: { ts: 'desc' },
      select: { deviceId: true, ts: true, payload: true }
    })

    return reply.send(buildDailyGasHistory(rows as any))
  })

  // Create site (simple; you can lock this down later)
  // Create site (simple; you can lock this down later)
  app.post('/sites', async (req, reply) => {
    const body = (req.body ?? {}) as SiteCreateBody

    if (!body.code || !String(body.code).trim()) {
      return reply.code(400).send({ error: 'code_required' })
    }

    const code = String(body.code).trim()

    const geoParsed = parseGeoChange(body)
    if (!geoParsed.ok) return reply.code(400).send({ error: geoParsed.error })

    const metaOut =
      geoParsed.change !== undefined
        ? mergeMetaGeo(body.meta, geoParsed.change)
        : (body.meta ?? undefined)

    const created = await app.prisma.site.create({
      data: {
        code,
        name: body.name ?? null,
        type: (body.type as any) ?? 'UNKNOWN',
        timezone: body.timezone ?? 'America/Denver',
        hutCode: body.hutCode ?? null,
        meta: metaOut ?? undefined,
        ingestKey: body.ingestKey ?? null
      }
    })

    return { ok: true, id: created.id }
  })

  // Patch site (edit)
  // Patch site (edit)
  app.patch('/sites/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as SitePatchBody

    const geoParsed = parseGeoChange(body)
    if (!geoParsed.ok) return reply.code(400).send({ error: geoParsed.error })

    // If geo is included OR meta is included, we need a base meta to merge safely
    const wantsGeoChange = geoParsed.change !== undefined
    const wantsMetaChange = body.meta !== undefined

    let existingMeta: any = undefined
    if (wantsGeoChange || wantsMetaChange) {
      const existing = await app.prisma.site.findUnique({
        where: { id },
        select: { meta: true }
      })
      if (!existing) return reply.code(404).send({ error: 'site_not_found' })
      existingMeta = existing.meta
    }

    const data: any = {}

    if (body.code !== undefined) data.code = String(body.code).trim()
    if (body.name !== undefined) data.name = body.name
    if (body.type !== undefined) data.type = body.type as any
    if (body.timezone !== undefined) data.timezone = body.timezone
    if (body.hutCode !== undefined) data.hutCode = body.hutCode
    if (body.ingestKey !== undefined) data.ingestKey = body.ingestKey

    // meta/geo merge logic
    if (wantsGeoChange) {
      const base = wantsMetaChange ? body.meta : existingMeta
      data.meta = mergeMetaGeo(base, geoParsed.change)
    } else if (wantsMetaChange) {
      data.meta = body.meta ?? undefined
    }

    const updated = await app.prisma.site.update({
      where: { id },
      data,
      select: { id: true, code: true, meta: true }
    })

    return { ok: true, site: updated }
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
