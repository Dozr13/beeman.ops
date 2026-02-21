import { Prisma } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPrisma } from '../client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// MAY OVERRIDE:FALSE
dotenv.config({
  path: path.resolve(__dirname, '../../../../.env'),
  override: true
})

const prisma = getPrisma()

const main = async () => {
  const sites = await prisma.site.findMany({
    where: { hutCode: { not: null } },
    select: { id: true, code: true, hutCode: true, createdAt: true }
  })

  if (sites.length === 0) {
    console.log('[backfill] No sites with hutCode found. Nothing to do.')
    return
  }

  // Detect inconsistent state early (same hutCode assigned to multiple sites)
  const byCode = new Map<string, { siteId: string; siteCode: string }[]>()
  for (const s of sites) {
    const hc = (s.hutCode ?? '').trim()
    if (!hc) continue
    const arr = byCode.get(hc) ?? []
    arr.push({ siteId: s.id, siteCode: s.code })
    byCode.set(hc, arr)
  }

  const conflicts = [...byCode.entries()].filter(([, arr]) => arr.length > 1)
  if (conflicts.length) {
    console.error(
      '[backfill] CONFLICT: same hutCode appears on multiple sites:'
    )
    for (const [hutCode, arr] of conflicts) {
      console.error(`  ${hutCode}: ${arr.map((x) => x.siteCode).join(', ')}`)
    }
    throw new Error('Backfill aborted: resolve hutCode conflicts first.')
  }

  console.log(`[backfill] sites with hutCode: ${sites.length}`)

  // Upsert huts + create current assignments if missing
  for (const s of sites) {
    const hutCode = (s.hutCode ?? '').trim()
    if (!hutCode) continue

    const hut = await prisma.hut.upsert({
      where: { code: hutCode },
      update: {},
      create: { code: hutCode }
    })

    const existing = await prisma.hutAssignment.findFirst({
      where: { siteId: s.id, endsAt: null },
      select: { id: true, hutId: true }
    })

    if (existing) {
      console.log(
        `[backfill] site ${s.code} already has current assignment (${existing.id}), skipping`
      )
      continue
    }

    // If the hut already has a current assignment (shouldn't happen with conflicts check),
    // close it to keep data consistent.
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.hutAssignment.updateMany({
        where: { hutId: hut.id, endsAt: null },
        data: { endsAt: new Date() }
      })

      await tx.hutAssignment.create({
        data: {
          hutId: hut.id,
          siteId: s.id,
          // choose createdAt so it feels like "it’s been there since site was created"
          startsAt: s.createdAt
        }
      })
    })

    console.log(`[backfill] assigned hut ${hutCode} -> site ${s.code}`)
  }

  console.log('[backfill] done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
