import { HeartbeatBody } from '@ops/shared'
import type { FastifyPluginAsync } from 'fastify'
import { requireIngestKey } from './_auth.js'

type ResolveOk = { siteId: string; siteCode: string }
type ResolveErr = { error: { status: number; body: any } }
type ResolveSiteResult = ResolveOk | ResolveErr

const resolveSite = async (
  app: any,
  input: { siteCode?: string; hutCode?: string }
): Promise<ResolveSiteResult> => {
  const hutCode = (input.hutCode ?? '').trim()
  const siteCode = (input.siteCode ?? '').trim()

  if (hutCode) {
    const hut = await app.prisma.hut.findUnique({
      where: { code: hutCode },
      select: { id: true }
    })
    if (!hut)
      return { error: { status: 404, body: { error: 'hut_not_found' } } }

    const asg = await app.prisma.hutAssignment.findFirst({
      where: { hutId: hut.id, endsAt: null },
      select: { site: { select: { id: true, code: true } } }
    })
    if (!asg)
      return { error: { status: 409, body: { error: 'hut_unassigned' } } }

    return { siteId: asg.site.id, siteCode: asg.site.code }
  }

  if (!siteCode)
    return {
      error: { status: 400, body: { error: 'siteCode_or_hutCode_required' } }
    }

  const site = await app.prisma.site.upsert({
    where: { code: siteCode },
    update: {},
    create: { code: siteCode, type: 'UNKNOWN', timezone: 'America/Denver' }
  })

  return { siteId: site.id, siteCode: site.code }
}

export const heartbeatRoutes: FastifyPluginAsync = async (app) => {
  app.post('/v1/heartbeat', async (req, reply) => {
    const parsed = HeartbeatBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten())

    const body: any = parsed.data
    const resolved = await resolveSite(app, {
      siteCode: body.siteCode,
      hutCode: body.hutCode
    })
    if ('error' in resolved)
      return reply.code(resolved.error.status).send(resolved.error.body)

    if (!(await requireIngestKey(app, req, resolved.siteCode))) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    await app.prisma.heartbeat.create({
      data: {
        siteId: resolved.siteId,
        ts: new Date(body.ts),
        agentId: body.agentId,
        meta: { ...(body.meta ?? {}), hutCode: body.hutCode ?? undefined }
      }
    })

    return reply.send({ ok: true })
  })
}
