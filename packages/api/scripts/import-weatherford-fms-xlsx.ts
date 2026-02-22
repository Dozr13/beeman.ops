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

type SiteMap = Record<string, string>

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const cellString = (v: unknown) => (v == null ? '' : String(v)).trim()

const norm = (v: unknown) =>
  cellString(v).toLowerCase().replace(/\s+/g, ' ').trim()

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Excel dates can arrive as:
 * - Date objects (if cellDates: true)
 * - Excel serial numbers (common)
 * - Strings (less common)
 */
const asDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v

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
  const s = norm(v).replace(/\s/g, '')
  return s === 'meterid:' || s === 'meterid'
}

const isFacilityIdLabel = (v: unknown) => {
  const s = norm(v).replace(/\s/g, '')
  return s === 'facilityid:' || s === 'facilityid'
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
  const idx = row.findIndex((c) => norm(c) === 'description')
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

/**
 * IMPORTANT FIX:
 * sheet_to_json() normally uses ws["!ref"] (declared used-range).
 * Your file shows content in Numbers beyond that range.
 * So we compute the true range from cell keys and force that range.
 */
const sheetToGridAllCells = (ws: XLSX.WorkSheet, debug = false) => {
  const keys = Object.keys(ws).filter((k) => !k.startsWith('!'))

  let maxR = 0
  let maxC = 0

  for (const addr of keys) {
    // Only accept valid A1-style addresses
    if (!/^[A-Z]+[0-9]+$/i.test(addr)) continue
    const { r, c } = XLSX.utils.decode_cell(addr)
    if (r > maxR) maxR = r
    if (c > maxC) maxC = c
  }

  const forcedRange = {
    s: { r: 0, c: 0 },
    e: { r: maxR, c: maxC }
  }

  if (debug) {
    console.log(`ws['!ref'] = ${String((ws as any)['!ref'] ?? '(none)')}`)
    console.log(
      `forcedRange = A1:${XLSX.utils.encode_cell({ r: maxR, c: maxC })}`
    )
    console.log(`cellKeys = ${keys.length}`)
  }

  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    range: forcedRange
  }) as unknown[][]
}

/**
 * Canonicalize BULLDOG well description into a clean Site code/name.
 * Example: "BULLDOG 26-34H-894" -> code/name "Bulldog-26"
 */
const canonicalBulldogSite = (desc: string) => {
  const m = /^BULLDOG\s+(\d+)-/i.exec(desc.trim())
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n)) return null
  return { code: `Bulldog-${n}`, name: `Bulldog-${n}`, type: 'WELL' as const }
}

const parseSheet = (
  ws: XLSX.WorkSheet,
  sheetName: string,
  debug = false
): MeterBlock[] => {
  const grid = sheetToGridAllCells(ws, debug)
  const blocks: MeterBlock[] = []

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i] ?? []
    const meterId = findMeterId(row)
    if (!meterId) continue

    let facilityId: string | undefined
    let description: string | undefined

    // Look ahead for facility/description for this block
    for (let k = i; k < Math.min(i + 60, grid.length); k++) {
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
          `[${sheetName}] No header found near row=${i + 1} meterId=${meterId}`
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

      // Stop at next block
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

    blocks.push({ sheetName, meterId, facilityId, description, rows })
    i = dataStart
  }

  return blocks
}

const parseWorkbookAllSheets = (buf: Buffer, debug = false): MeterBlock[] => {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

  if (debug) console.log(`Sheets: ${wb.SheetNames.join(', ')}`)

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

const readJsonFile = <T>(p: string): T =>
  JSON.parse(fs.readFileSync(p, 'utf8')) as T

const main = async () => {
  const file = getArg('--file')
  if (!file) {
    throw new Error(
      'Usage: yarn tsx packages/api/scripts/import-weatherford-fms-xlsx.ts --file "<path-to-xlsx>" [--map "<path-to-json>"] [--debug] [--dry-run]'
    )
  }

  const debug = hasFlag('--debug')
  const dryRun = hasFlag('--dry-run')
  const mapPath = getArg('--map')

  const resolved = path.resolve(file)
  if (!fs.existsSync(resolved)) throw new Error(`XLSX not found: ${resolved}`)

  const siteMap: SiteMap | null = mapPath
    ? readJsonFile<SiteMap>(path.resolve(mapPath))
    : null

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

  const defaultSiteType = (process.env.SITE_TYPE?.trim() || 'UNKNOWN') as any

  const prisma = getPrisma()

  for (const b of blocks) {
    const mappedCode =
      (siteMap ? siteMap[b.description] : undefined) ??
      (siteMap ? siteMap[b.meterId] : undefined)

    const canonical = !mappedCode ? canonicalBulldogSite(b.description) : null

    // SITE CODE:
    // - explicit map wins
    // - canonical BULLDOG -> Bulldog-#
    // - else placeholder wf-*
    const siteCode =
      mappedCode ?? canonical?.code ?? `wf-${slug(b.description)}`
    const siteName =
      canonical?.name ?? (mappedCode ? mappedCode : b.description)
    const desiredType =
      canonical?.type ?? (mappedCode ? 'WELL' : defaultSiteType)

    const exampleData = {
      rangeStart: minTs.toISOString().slice(0, 10),
      rangeEnd: maxTs.toISOString().slice(0, 10),
      note: 'Example data import from Weatherford/FMS XLSX; intent is live telemetry later.',
      sourceFile: path.basename(resolved),
      sheet: b.sheetName
    }

    if (dryRun) {
      console.log(
        `[DRY] site=${siteCode} name="${siteName}" type=${desiredType} meter=${b.meterId} desc="${b.description}" rows=${b.rows.length}`
      )
      continue
    }

    const existing = await prisma.site.findUnique({
      where: { code: siteCode },
      select: { id: true, type: true, meta: true, name: true }
    })

    const prevMeta =
      existing?.meta &&
      typeof existing.meta === 'object' &&
      !Array.isArray(existing.meta)
        ? (existing.meta as Record<string, any>)
        : {}

    const mergedMeta: Record<string, any> = {
      ...prevMeta,
      source: 'weatherford_xlsx',
      exampleData,
      weatherford: {
        ...(prevMeta.weatherford && typeof prevMeta.weatherford === 'object'
          ? prevMeta.weatherford
          : {}),
        meterId: b.meterId,
        facilityId: b.facilityId ?? null,
        description: b.description
      }
    }

    const site = existing
      ? await prisma.site.update({
          where: { id: existing.id },
          data: {
            name: siteName,
            // Only override UNKNOWN when we know better (canonical bulldog / explicit map)
            type:
              existing.type === 'UNKNOWN' && (canonical || mappedCode)
                ? desiredType
                : existing.type,
            meta: mergedMeta
          }
        })
      : await prisma.site.create({
          data: {
            code: siteCode,
            name: siteName,
            type: desiredType,
            timezone: 'America/Denver',
            meta: mergedMeta
          }
        })

    const device = await prisma.device.upsert({
      where: {
        siteId_externalId: { siteId: site.id, externalId: b.meterId }
      },
      create: {
        siteId: site.id,
        externalId: b.meterId,
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
      `Imported: site=${site.code} name="${site.name}" meter=${b.meterId} rows=${b.rows.length}`
    )
  }

  console.log(
    `Done. unique_descriptions=${new Set(blocks.map((b) => b.description)).size} meters=${blocks.length} range=${minTs
      .toISOString()
      .slice(0, 10)}..${maxTs.toISOString().slice(0, 10)}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
