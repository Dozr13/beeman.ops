// packages/api/scripts/import-weatherford-fms-xlsx.ts
import { getPrisma } from '@ops/db'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

type MeterRow = {
  ts: Date
  tempF: number | null
  dpInH2O: number | null
  lpPsi: number | null
  flowHrs: number | null
  volMcf: number | null
  mmbtu: number | null
}

type MeterBlock = {
  sheetName: string
  meterId: string
  facilityId?: string
  description: string
  rows: MeterRow[]
}

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const cellString = (v: unknown) => (v == null ? '' : String(v)).trim()

/**
 * Excel dates can arrive as:
 * - Date objects (if cellDates: true and the sheet stores dates)
 * - Excel serial numbers (common)
 * - Strings (less common)
 */
const asDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v

  // Excel serial date number
  if (typeof v === 'number' && Number.isFinite(v)) {
    const dc = XLSX.SSF.parse_date_code(v)
    if (!dc || !dc.y || !dc.m || !dc.d) return null
    return new Date(
      Date.UTC(dc.y, dc.m - 1, dc.d, dc.H || 0, dc.M || 0, dc.S || 0)
    )
  }

  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isFinite(d.getTime()) ? d : null
  }

  return null
}

// Matches "Meter ID:", "Meter Id", "METER ID :", etc.
const isMeterIdLabel = (v: unknown) => {
  const s = cellString(v).toLowerCase().replace(/\s+/g, ' ')
  return (
    s === 'meter id:' || s === 'meter id' || s === 'meterid:' || s === 'meterid'
  )
}

// Matches "Facility ID:", etc.
const isFacilityIdLabel = (v: unknown) => {
  const s = cellString(v).toLowerCase().replace(/\s+/g, ' ')
  return (
    s === 'facility id:' ||
    s === 'facility id' ||
    s === 'facilityid:' ||
    s === 'facilityid'
  )
}

const findMeterId = (row: unknown[]): string | undefined => {
  const idx = row.findIndex(isMeterIdLabel)
  if (idx === -1) return undefined
  const val = cellString(row[idx + 1])
  return val ? val : undefined
}

const findFacilityId = (row: unknown[]): string | undefined => {
  const idx = row.findIndex(isFacilityIdLabel)
  if (idx === -1) return undefined
  const val = cellString(row[idx + 1])
  return val ? val : undefined
}

const findDescription = (row: unknown[]): string | undefined => {
  // Usually: ["", "", "", "", "Description", "<value>"]
  const idx = row.findIndex(
    (c) => cellString(c).toLowerCase() === 'description'
  )
  if (idx === -1) return undefined
  const val = cellString(row[idx + 1])
  return val ? val : undefined
}

const findHeaderIndex = (grid: unknown[][], startIdx: number): number => {
  for (let i = startIdx; i < grid.length; i++) {
    const r = grid[i] ?? []
    const hasDate = r.some((c) => cellString(c) === 'Date')
    const hasTemp = r.some((c) => cellString(c) === 'Temp')
    if (hasDate && hasTemp) return i
  }
  return -1
}

const buildHeaderMap = (headerRow: unknown[]) => {
  const map = new Map<string, number>()
  headerRow.forEach((c, idx) => {
    const key = cellString(c)
    if (key) map.set(key, idx)
  })
  return map
}

const parseSheet = (
  ws: XLSX.WorkSheet,
  sheetName: string,
  debug = false
): MeterBlock[] => {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true
  }) as unknown[][]
  const blocks: MeterBlock[] = []

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i] ?? []
    const meterId = findMeterId(row)
    if (!meterId) continue

    let facilityId: string | undefined
    let description: string | undefined

    // Look ahead for facility/description for this block
    for (let k = i; k < Math.min(i + 40, grid.length); k++) {
      const r = grid[k] ?? []
      facilityId ||= findFacilityId(r)
      description ||= findDescription(r)
      if (facilityId && description) break
    }

    if (!description) description = meterId

    const headerIdx = findHeaderIndex(grid, i)
    if (headerIdx === -1) {
      if (debug)
        console.warn(
          `[${sheetName}] No header row found near row=${i + 1} meterId=${meterId}`
        )
      continue
    }

    const headerRow = grid[headerIdx] ?? []
    const headerMap = buildHeaderMap(headerRow)

    const colDate = headerMap.get('Date')
    const colTemp = headerMap.get('Temp')
    const colDP = headerMap.get('DP')
    const colLP = headerMap.get('LP')
    const colFlowHrs = headerMap.get('Flow Hrs') ?? headerMap.get('FlowHrs')
    const colVol =
      headerMap.get('Vol MCF') ??
      headerMap.get('Vol (MCF)') ??
      headerMap.get('Volume')
    const colMMBTU = headerMap.get('MMBTU')

    if (debug) {
      console.log(
        `[${sheetName}] meterId=${meterId} desc="${description}" headerRow=${headerIdx + 1} cols=` +
          JSON.stringify({
            Date: colDate,
            Temp: colTemp,
            DP: colDP,
            LP: colLP,
            'Flow Hrs': colFlowHrs,
            'Vol MCF': colVol,
            MMBTU: colMMBTU
          })
      )
    }

    if (colDate == null) continue

    // Units row usually next row; data starts after that
    const dataStart = headerIdx + 2
    const rows: MeterRow[] = []

    for (let k = dataStart; k < grid.length; k++) {
      const r = grid[k] ?? []

      // Stop at next block or missing date
      if (r.some(isMeterIdLabel)) break

      const dateCell = r[colDate]
      if (dateCell == null || cellString(dateCell) === '') break

      const d = asDate(dateCell)
      if (!d) continue

      const ts = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      )

      rows.push({
        ts,
        tempF: colTemp != null ? num(r[colTemp]) : null,
        dpInH2O: colDP != null ? num(r[colDP]) : null,
        lpPsi: colLP != null ? num(r[colLP]) : null,
        flowHrs: colFlowHrs != null ? num(r[colFlowHrs]) : null,
        volMcf: colVol != null ? num(r[colVol]) : null,
        mmbtu: colMMBTU != null ? num(r[colMMBTU]) : null
      })
    }

    blocks.push({
      sheetName,
      meterId,
      facilityId,
      description,
      rows
    })

    // Skip forward a bit (optional)
    i = dataStart
  }

  return blocks
}

const parseWorkbookAllSheets = (buf: Buffer, debug = false): MeterBlock[] => {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

  if (debug) {
    console.log(`Sheets: ${wb.SheetNames.join(', ')}`)
  }

  const all: MeterBlock[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const blocks = parseSheet(ws, sheetName, debug)
    if (debug) console.log(`[${sheetName}] blocks=${blocks.length}`)
    all.push(...blocks)
  }

  return all
}

const getArg = (name: string) => {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

const hasFlag = (name: string) => process.argv.includes(name)

const main = async () => {
  const file = getArg('--file')
  if (!file) {
    throw new Error(
      'Usage: yarn tsx packages/api/scripts/import-weatherford-fms-xlsx.ts --file "<path-to-xlsx>" [--debug]'
    )
  }

  const debug = hasFlag('--debug')
  const resolved = path.resolve(file)
  if (!fs.existsSync(resolved)) throw new Error(`XLSX not found: ${resolved}`)

  const buf = fs.readFileSync(resolved)
  const blocks = parseWorkbookAllSheets(buf, debug)

  const times = blocks
    .flatMap((b) => b.rows.map((r) => r.ts?.getTime()))
    .filter((t): t is number => typeof t === 'number' && Number.isFinite(t))

  if (times.length === 0) {
    const firstFew = blocks.slice(0, 10).map((b) => ({
      sheet: b.sheetName,
      meterId: b.meterId,
      description: b.description,
      rows: b.rows.length
    }))
    throw new Error(
      `No dated rows parsed from XLSX. Try rerun with --debug. Parsed blocks summary: ${JSON.stringify(firstFew)}`
    )
  }

  const minTs = new Date(Math.min(...times))
  const maxTs = new Date(Math.max(...times))

  const siteType = (process.env.SITE_TYPE?.trim() || 'UNKNOWN') as any
  const prisma = getPrisma()

  for (const b of blocks) {
    const siteCode = `wf-${slug(b.description)}`
    const deviceExternalId = b.meterId

    const exampleData = {
      rangeStart: minTs.toISOString().slice(0, 10),
      rangeEnd: maxTs.toISOString().slice(0, 10),
      note: 'Example data import from Weatherford/FMS XLSX; intent is live telemetry later.',
      sourceFile: path.basename(resolved),
      sheet: b.sheetName
    }

    const site = await prisma.site.upsert({
      where: { code: siteCode },
      create: {
        code: siteCode,
        name: b.description,
        type: siteType,
        timezone: 'America/Denver',
        meta: {
          source: 'weatherford_xlsx',
          exampleData
        }
      },
      update: {
        name: b.description,
        type: siteType,
        timezone: 'America/Denver',
        meta: {
          source: 'weatherford_xlsx',
          exampleData
        }
      }
    })

    const device = await prisma.device.upsert({
      where: {
        siteId_externalId: { siteId: site.id, externalId: deviceExternalId }
      },
      create: {
        siteId: site.id,
        externalId: deviceExternalId,
        kind: 'GAS_METER',
        name: b.description,
        meta: {
          vendor: 'weatherford_fms',
          meterId: b.meterId,
          facilityId: b.facilityId ?? null,
          description: b.description,
          sheet: b.sheetName
        }
      },
      update: {
        name: b.description,
        kind: 'GAS_METER',
        meta: {
          vendor: 'weatherford_fms',
          meterId: b.meterId,
          facilityId: b.facilityId ?? null,
          description: b.description,
          sheet: b.sheetName
        }
      }
    })

    if (b.rows.length === 0) {
      console.warn(
        `No rows for meter=${b.meterId} desc="${b.description}" (sheet=${b.sheetName}). Skipping metrics.`
      )
      continue
    }

    // Idempotent: delete existing metrics in range
    await prisma.metric.deleteMany({
      where: {
        deviceId: device.id,
        ts: { gte: minTs, lte: maxTs }
      }
    })

    await prisma.metric.createMany({
      data: b.rows.map((r) => ({
        id: crypto.randomUUID(),
        deviceId: device.id,
        ts: r.ts,
        payload: {
          source: 'weatherford_xlsx',
          kind: 'daily_gas',
          meterId: b.meterId,
          facilityId: b.facilityId ?? null,
          description: b.description,
          sheet: b.sheetName,
          date: r.ts.toISOString().slice(0, 10),
          temp_f: r.tempF,
          dp_inh2o: r.dpInH2O,
          lp_psi: r.lpPsi,
          flow_hrs: r.flowHrs,
          vol_mcf: r.volMcf,
          mmbtu: r.mmbtu
        }
      }))
    })

    console.log(
      `Imported: "${b.description}" site=${site.code} meter=${b.meterId} sheet=${b.sheetName} rows=${b.rows.length}`
    )
  }

  console.log(
    `Done. unique_sites=${new Set(blocks.map((b) => b.description)).size} meters=${blocks.length} range=${minTs
      .toISOString()
      .slice(0, 10)}..${maxTs.toISOString().slice(0, 10)}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
