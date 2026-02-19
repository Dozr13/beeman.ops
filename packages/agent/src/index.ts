import { HeartbeatBody, IngestBatch, nowIso } from '@ops/shared'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCollectors } from './collectors/index.js'
import { loadConfig, resolveConfigPath } from './config.js'
import { postJson } from './http.js'
import { createQueue } from './queue.js'

// ---- Robust config resolution ----
// agent package dir = ../../ (from src/index.ts)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AGENT_PKG_DIR = path.resolve(__dirname, '..') // packages/agent/src -> packages/agent

const argPath = process.argv
  .find((a) => a.startsWith('--config='))
  ?.split('=', 2)[1]

const CONFIG_PATH = resolveConfigPath({
  envPath: process.env.AGENT_CONFIG_PATH,
  argPath,
  defaultFileName: 'agent.config.yml',
  agentPackageDir: AGENT_PKG_DIR
})

const cfg = loadConfig(CONFIG_PATH)

// ---- Read config/env ----
const siteCode = process.env.AGENT_SITE_CODE ?? cfg.siteCode ?? 'DEV-SITE'
const agentId = process.env.AGENT_ID ?? cfg.agentId ?? 'dev-agent'
const apiUrl =
  process.env.AGENT_API_URL ?? cfg.api?.url ?? 'http://localhost:3002'

// SINGLE KEY SOURCE OF TRUTH:
const ingestKey =
  process.env.OPS_INGEST_KEY ?? cfg.api?.ingestKey ?? 'dev-secret-change-me'

const intervalSeconds = Number(cfg.intervalSeconds ?? 30)

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
