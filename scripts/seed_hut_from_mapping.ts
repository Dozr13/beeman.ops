import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getPrisma } from '@ops/db'

type Row = { Position: string; 'Miner IP': string; 'Miner MAC'?: string }

const HUT_CODE = process.argv[2]
if (!HUT_CODE) {
  console.error('Usage: tsx scripts/seed_hut_from_mapping.ts <HUT_CODE>')
  process.exit(1)
}

const csvPath = path.resolve(
  process.cwd(),
  `packages/ops-data/huts/${HUT_CODE}/mapping.csv`
)

const parseCsv = (text: string) => {
  // small CSV parser that handles quotes
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const n = text[i + 1]
    if (inQuotes) {
      if (c === '"' && n === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (c !== '\r') field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const main = async () => {
  const prisma = getPrisma()

  const raw = readFileSync(csvPath, 'utf8')
  const rows = parseCsv(raw)
  const header = rows.shift()!
  const idx = (name: string) => header.findIndex((h) => h.trim() === name)

  const posI = idx('Position')
  const ipI = idx('Miner IP')
  const macI = idx('Miner MAC')

  if (posI === -1 || ipI === -1) {
    throw new Error('CSV must contain columns: Position, Miner IP (and ideally Miner MAC)')
  }

  const mapped: Row[] = rows
    .map((r) => ({
      Position: (r[posI] ?? '').trim(),
      'Miner IP': (r[ipI] ?? '').trim(),
      'Miner MAC': macI === -1 ? '' : (r[macI] ?? '').trim()
    }))
    .filter((r) => r.Position)

  // 1) Ensure Site (use hut code as site name)
  const site =
    (await prisma.site.findFirst({ where: { name: HUT_CODE } })) ??
    (await prisma.site.create({ data: { name: HUT_CODE } }))

  // 2) Ensure Hut
  const hut =
    (await prisma.hut.findFirst({ where: { code: HUT_CODE } })) ??
    (await prisma.hut.create({ data: { code: HUT_CODE, name: HUT_CODE } as any }))

  // 3) Ensure active HutAssignment
  const existingAssign = await prisma.hutAssignment.findFirst({
    where: { hutId: hut.id, endsAt: null }
  })
  if (!existingAssign) {
    await prisma.hutAssignment.create({
      data: { hutId: hut.id, siteId: site.id } as any
    })
  }

  // 4) Ensure miner Devices exist for each mapped IP
  const miners = mapped.filter((r) => r['Miner IP'])
  for (const m of miners) {
    const ip = m['Miner IP']
    const loc = m.Position
    const mac = m['Miner MAC'] || ''

    // Find an existing device by externalId or meta.ip
    const existing = await prisma.device.findFirst({
      where: {
        siteId: site.id,
        kind: 'MINER' as any,
        OR: [
          { externalId: ip },
          { name: ip },
          // Prisma JSON filter (works if meta is Json)
          { meta: { path: ['ip'], equals: ip } as any }
        ]
      } as any
    })

    const meta = { ip, loc, ...(mac ? { mac } : {}) }

    if (!existing) {
      await prisma.device.create({
        data: {
          siteId: site.id,
          kind: 'MINER' as any,
          name: ip,
          externalId: ip,
          meta
        } as any
      })
    } else {
      await prisma.device.update({
        where: { id: existing.id },
        data: { meta: { ...(existing.meta as any), ...meta } }
      })
    }
  }

  console.log(`Seeded ${miners.length} miner devices for site=${site.name} hut=${hut.code}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
