import { MinerRecordDto } from '@ops/shared'
import type { FastifyPluginAsync } from 'fastify'

const normalizeIp = (v: string) => {
  const s = v.trim()
  const m = s.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/)
  return (m?.[1] ?? s).trim()
}

const tsMs = (iso: string | null | undefined) => {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

const pickBetterMiner = (a: MinerRecordDto, b: MinerRecordDto) => {
  const at = tsMs(a.ts)
  const bt = tsMs(b.ts)

  // Prefer "has a timestamp" over "no timestamp"
  if (at == null && bt != null) return b
  if (bt == null && at != null) return a

  // If both have timestamps, prefer newest
  if (at != null && bt != null && at !== bt) return bt > at ? b : a

  const aScore = (a.reachable ? 10 : 0) + (a.api_4028 ? 5 : 0)
  const bScore = (b.reachable ? 10 : 0) + (b.api_4028 ? 5 : 0)
  if (aScore !== bScore) return bScore > aScore ? b : a

  const fullness = (m: MinerRecordDto) =>
    Number(m.power_w != null) +
    Number(m.ghs_5s != null) +
    Number(m.ghs_av != null) +
    Number(m.pool_user != null) +
    Number(m.pool_status != null)

  const af = fullness(a)
  const bf = fullness(b)
  if (af !== bf) return bf > af ? b : a

  return a
}

const dedupeMinersByIp = (miners: MinerRecordDto[]) => {
  const map = new Map<string, MinerRecordDto>()
  for (const m of miners) {
    const key = normalizeIp(m.ip)
    const prev = map.get(key)
    map.set(key, prev ? pickBetterMiner(prev, m) : { ...m, ip: key })
  }
  return Array.from(map.values())
}

const asObj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null

const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const asBool = (v: unknown): boolean | null =>
  typeof v === 'boolean' ? v : null
const asNum = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null
const asStrArray = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
    ? (v as string[])
    : null

const toMinerRecord = (d: {
  externalId: string
  name: string | null
  meta: unknown
  status: { ts: Date; payload: unknown } | null
}): MinerRecordDto | null => {
  const payload = asObj(d.status?.payload) ?? {}
  const meta = asObj(d.meta) ?? {}

  const ipRaw =
    asStr(payload.ip) ??
    asStr(meta.ip) ??
    asStr(meta.host) ??
    d.name ??
    d.externalId

  if (!ipRaw) return null
  const ip = normalizeIp(ipRaw)

  if (!ip) return null

  const ts = d.status?.ts ? d.status.ts.toISOString() : null

  const reachable = asBool(payload.reachable) ?? false
  const api_4028 = asBool(payload.api_4028) ?? false

  // ✅ IMPORTANT FIX:
  // Prefer meta.loc (your mapping truth) over payload.loc (ingest noise / legacy)
  const loc = asStr(meta.loc) ?? asStr((payload as any).loc) ?? null
  // const loc = device.meta?.loc ?? payload.loc ?? null
  console.log('loc value: ', loc)

  const out: MinerRecordDto = {
    ip,
    reachable,
    api_4028,
    ts,
    loc,
    errors: asStrArray((payload as any).errors) ?? null,
    raw: (payload as any).raw ?? payload
  }

  out.ghs_5s = asNum((payload as any).ghs_5s)
  out.ghs_av = asNum((payload as any).ghs_av)
  out.ghs_1m = asNum((payload as any).ghs_1m)
  out.ghs_5m = asNum((payload as any).ghs_5m)
  out.ghs_15m = asNum((payload as any).ghs_15m)

  out.uptime_s = asNum((payload as any).uptime_s)
  out.accepted = asNum((payload as any).accepted)
  out.rejected = asNum((payload as any).rejected)

  out.fan_in = asNum((payload as any).fan_in)
  out.fan_out = asNum((payload as any).fan_out)
  out.power_w = asNum((payload as any).power_w)
  out.voltage_mv = asNum((payload as any).voltage_mv)

  out.pool_url = asStr((payload as any).pool_url)
  out.pool_user = asStr((payload as any).pool_user)
  out.pool_status = asStr((payload as any).pool_status)

  return out
}

export const hutsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/huts', async () => {
    const huts = await app.prisma.hut.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true }
    })

    const assignments = await app.prisma.hutAssignment.findMany({
      where: { endsAt: null },
      select: {
        hutId: true,
        site: { select: { id: true, code: true, name: true } }
      }
    })

    const siteByHutId = new Map(assignments.map((a) => [a.hutId, a.site]))

    return huts.map((h) => ({
      id: h.id,
      code: h.code,
      name: h.name,
      currentSite: siteByHutId.get(h.id) ?? null
    }))
  })

  app.get('/huts/:hutCode', async (req, reply) => {
    const { hutCode } = req.params as { hutCode: string }

    const hut = await app.prisma.hut.findUnique({
      where: { code: hutCode },
      select: { id: true, code: true, name: true }
    })
    if (!hut) return reply.code(404).send({ error: 'hut_not_found' })

    const assignment = await app.prisma.hutAssignment.findFirst({
      where: { hutId: hut.id, endsAt: null },
      select: { site: { select: { id: true, code: true, name: true } } }
    })

    return reply.send({
      id: hut.id,
      code: hut.code,
      name: hut.name,
      currentSite: assignment?.site ?? null
    })
  })

  app.post('/huts', async (req, reply) => {
    const body = (req.body ?? {}) as {
      code?: string
      name?: string | null
      meta?: any
    }

    const code = String(body.code ?? '').trim()
    if (!code) return reply.code(400).send({ error: 'code_required' })

    const created = await app.prisma.hut.create({
      data: {
        code,
        name: body.name ?? null,
        meta: body.meta ?? undefined
      },
      select: { id: true, code: true, name: true }
    })

    return reply.send({ ok: true, hut: created })
  })

  app.post('/huts/by-code/:hutCode/assign', async (req, reply) => {
    const { hutCode } = req.params as { hutCode: string }
    const body = (req.body ?? {}) as { siteId?: string | null }
    const siteId = body.siteId ?? null

    const hut = await app.prisma.hut.findUnique({
      where: { code: hutCode },
      select: { id: true }
    })
    if (!hut) return reply.code(404).send({ error: 'hut_not_found' })

    const now = new Date()

    await app.prisma
      .$transaction(async (tx) => {
        await tx.hutAssignment.updateMany({
          where: { hutId: hut.id, endsAt: null },
          data: { endsAt: now }
        })

        if (!siteId) return

        const site = await tx.site.findUnique({
          where: { id: siteId },
          select: { id: true }
        })
        if (!site) throw new Error('site_not_found')

        await tx.hutAssignment.updateMany({
          where: { siteId, endsAt: null },
          data: { endsAt: now }
        })

        await tx.hutAssignment.create({
          data: { hutId: hut.id, siteId, startsAt: now }
        })
      })
      .catch((e) => {
        if (String(e?.message).includes('site_not_found')) {
          return reply.code(404).send({ error: 'site_not_found' })
        }
        throw e
      })

    return reply.send({ ok: true })
  })

  app.post('/huts/:hutId/assign', async (req, reply) => {
    const { hutId } = req.params as { hutId: string }
    const body = (req.body ?? {}) as { siteId?: string | null }
    const siteId = body.siteId ?? null

    const hut = await app.prisma.hut.findUnique({
      where: { id: hutId },
      select: { id: true }
    })
    if (!hut) return reply.code(404).send({ error: 'hut_not_found' })

    if (siteId) {
      const site = await app.prisma.site.findUnique({
        where: { id: siteId },
        select: { id: true }
      })
      if (!site) return reply.code(404).send({ error: 'site_not_found' })
    }

    const now = new Date()

    await app.prisma.$transaction(async (tx) => {
      await tx.hutAssignment.updateMany({
        where: { hutId, endsAt: null },
        data: { endsAt: now }
      })

      if (!siteId) return

      await tx.hutAssignment.updateMany({
        where: { siteId, endsAt: null },
        data: { endsAt: now }
      })

      await tx.hutAssignment.create({
        data: { hutId, siteId, startsAt: now }
      })
    })

    return reply.send({ ok: true })
  })

  app.get('/huts/:hutCode/miners', async (req, reply) => {
    const { hutCode } = req.params as { hutCode: string }

    const hut = await app.prisma.hut.findUnique({
      where: { code: hutCode },
      select: { id: true }
    })
    if (!hut) return reply.code(404).send({ error: 'hut_not_found' })

    const current = await app.prisma.hutAssignment.findFirst({
      where: { hutId: hut.id, endsAt: null },
      select: { siteId: true }
    })
    if (!current) return reply.code(404).send({ error: 'hut_unassigned' })

    const siteId = current.siteId

    const devices = await app.prisma.device.findMany({
      where: { siteId, kind: 'MINER' },
      orderBy: [{ name: 'asc' }, { externalId: 'asc' }],
      select: {
        externalId: true,
        name: true,
        meta: true,
        status: { select: { ts: true, payload: true } }
      }
    })

    const minersRaw = devices
      .map((d) => toMinerRecord({ ...d, status: d.status ?? null }))
      .filter((m): m is MinerRecordDto => Boolean(m))

    const dupes = minersRaw.length - new Set(minersRaw.map((m) => m.ip)).size
    if (dupes > 0) {
      app.log.warn(
        { hutCode, siteId, dupes },
        'Duplicate miner IPs detected in device table'
      )
    }

    const miners = dedupeMinersByIp(minersRaw)
    return reply.send({ miners })
  })

  app.delete('/huts/:hutId', async (req, reply) => {
    const { hutId } = req.params as { hutId: string }

    const hut = await app.prisma.hut.findUnique({
      where: { id: hutId },
      select: { id: true }
    })
    if (!hut) return reply.code(404).send({ error: 'hut_not_found' })

    const now = new Date()

    await app.prisma.$transaction(async (tx) => {
      await tx.hutAssignment.updateMany({
        where: { hutId, endsAt: null },
        data: { endsAt: now }
      })

      await tx.hut.delete({ where: { id: hutId } })
    })

    return reply.send({ ok: true })
  })
}
