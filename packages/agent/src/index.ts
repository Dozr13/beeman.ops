import { HeartbeatBody, IngestBatch, nowIso } from '@ops/shared'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCollectors } from './collectors/index.js'
import { loadConfig, resolveConfigPath } from './config.js'
import { postJson } from './http.js'
import { createQueue } from './queue.js'
import fs from 'node:fs'

// ---- Robust config resolution ----
// agent package dir = ../../ (from src/index.ts)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AGENT_PKG_DIR = path.resolve(__dirname, '..') // packages/agent/src -> packages/agent
const REPO_ROOT_DIR = path.resolve(AGENT_PKG_DIR, '..', '..')

// Load repo-root env file for local dev.
// Prefer .env.local if present; otherwise fall back to .env.
// In production (Render/Vercel), do not read env files from disk.
if (!process.env.RENDER && !process.env.VERCEL) {
  const envLocalPath = path.join(REPO_ROOT_DIR, '.env.local')
  const envPath = path.join(REPO_ROOT_DIR, '.env')
  const picked = fs.existsSync(envLocalPath) ? envLocalPath : envPath

  dotenv.config({
    path: picked,
    override: false
  })
}
// console.log('ROOT - ', REPO_ROOT_DIR)

const argv = process.argv
const argPath =
  argv.find((a) => a.startsWith('--config='))?.split('=', 2)[1] ??
  (() => {
    const i = argv.indexOf('--config')
    return i >= 0 ? argv[i + 1] : undefined
  })()

const CONFIG_PATH = resolveConfigPath({
  envPath: process.env.AGENT_CONFIG_PATH,
  argPath,
  defaultFileName: 'agent.config.yml',
  agentPackageDir: AGENT_PKG_DIR,
  repoRootDir: REPO_ROOT_DIR
})

// console.log('CONFIG_PATH - ', CONFIG_PATH)

const cfg = loadConfig(CONFIG_PATH)

// console.log('cfg - ', cfg)

const asObj = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined

const asStr = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s : undefined
}

const asNum = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

const cfgApi = asObj((cfg as any).api)

// console.log('cfgApi - ', cfgApi)
// ---- Read config/env ----
const siteCode =
  asStr((cfg as any).siteCode) ??
  asStr(process.env.AGENT_SITE_CODE) ??
  'DEV-SITE'

// console.log('siteCode - ', siteCode)

const agentId =
  asStr((cfg as any).agentId) ?? asStr(process.env.AGENT_ID) ?? 'dev-agent'

// console.log('agentId - ', agentId)

const apiUrl =
  asStr(cfgApi?.url) ??
  asStr(process.env.AGENT_API_URL) ??
  'http://localhost:3002'

// console.log('apiUrl - ', apiUrl)

// SINGLE KEY SOURCE OF TRUTH:
const ingestKey =
  asStr(process.env.OPS_INGEST_KEY) ??
  asStr(cfgApi?.ingestKey) ??
  'dev-secret-change-me'

// console.log('#### INGEST KEY: ', ingestKey)

const intervalSeconds = asNum((cfg as any).intervalSeconds) ?? 30

// Store queue in agent package dir so it doesn’t end up in random CWDs
const queuePath = path.join(AGENT_PKG_DIR, `agent-${siteCode}.sqlite`)
const queue = createQueue(queuePath)

const log = (msg: string, extra?: any) => {
  const prefix = `[agent ${siteCode} ${agentId}]`
  if (extra !== undefined) console.log(prefix, msg, extra)
  else console.log(prefix, msg)
}

const headers = { 'x-ops-key': ingestKey }

const flushQueue = async () => {
  for (;;) {
    const item = queue.peek()
    if (!item) return
    try {
      await postJson(apiUrl, item.path, headers, item.body)
      queue.remove(item.id)
    } catch {
      // WAN down; retry later
      return
    }
  }
}

const tick = async () => {
  const ts = nowIso()

  const hb = HeartbeatBody.parse({
    siteCode,
    agentId,
    ts,
    meta: {
      intervalSeconds,
      configPath: CONFIG_PATH
    }
  })

  queue.enqueue({ kind: 'heartbeat', path: '/v1/heartbeat', body: hb })

  const ctx = {
    siteCode,
    agentId,
    nowIso,
    log,
    config: cfg
  }

  const collected = await runCollectors(ctx)

  const devices = [
    {
      externalId: `agent:${agentId}`,
      kind: 'AGENT' as const,
      name: `Agent ${agentId}`,
      meta: { siteCode }
    },
    ...collected.devices
  ]

  const metrics = [
    {
      deviceExternalId: `agent:${agentId}`,
      ts,
      payload: { uptime_s: Math.floor(process.uptime()), ts }
    },
    ...collected.metrics
  ]

  const batch = IngestBatch.parse({
    siteCode,
    agentId,
    devices,
    metrics
  })

  queue.enqueue({ kind: 'ingest', path: '/v1/ingest', body: batch })

  await flushQueue()
}

log(`starting; config=${CONFIG_PATH}`)
tick().catch((e) => log('tick error', String(e)))

setInterval(() => {
  tick().catch((e) => log('tick error', String(e)))
}, intervalSeconds * 1000)
