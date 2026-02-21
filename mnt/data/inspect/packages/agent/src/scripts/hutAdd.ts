import fs from 'node:fs'
import path from 'node:path'

type Args = {
  hutCode: string
  agentId?: string
  apiUrl?: string
  intervalSeconds?: number
  assignSiteCode?: string
  force?: boolean
  bootstrap?: boolean
}

const parseArgs = (): Args => {
  const argv = process.argv.slice(2)
  const out: any = {}

  const take = (k: string) => {
    const i = argv.indexOf(k)
    if (i < 0) return undefined
    const v = argv[i + 1]
    return v
  }

  const hutCode = argv.find((a) => !a.startsWith('-'))
  if (!hutCode) {
    console.error('Usage: hut:add <HUT_CODE> [--site <SITE_CODE>] [--agent <AGENT_ID>] [--api <API_URL>] [--interval <seconds>] [--bootstrap] [--force]')
    process.exit(2)
  }

  out.hutCode = hutCode
  out.assignSiteCode = take('--site')
  out.agentId = take('--agent')
  out.apiUrl = take('--api')

  const intervalRaw = take('--interval')
  if (intervalRaw) {
    const n = Number(intervalRaw)
    if (!Number.isFinite(n) || n <= 0) {
      console.error(`Invalid --interval: ${intervalRaw}`)
      process.exit(2)
    }
    out.intervalSeconds = n
  }

  out.bootstrap = argv.includes('--bootstrap')
  out.force = argv.includes('--force')
  return out as Args
}

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true })
}

const writeConfig = (args: Args) => {
  const repoRoot = process.cwd()
  const cfgDir = path.join(repoRoot, 'packages', 'agent', 'config')
  ensureDir(cfgDir)

  const cfgPath = path.join(cfgDir, `${args.hutCode}.yml`)
  if (fs.existsSync(cfgPath) && !args.force) {
    console.error(`Config already exists: ${cfgPath} (use --force to overwrite)`)
    process.exit(1)
  }

  const apiUrl = args.apiUrl ?? process.env.AGENT_API_URL ?? 'https://beeman-ops-api.onrender.com'
  const intervalSeconds = args.intervalSeconds ?? 300
  const agentId = args.agentId ?? `${args.hutCode.toLowerCase()}-agent-001`

  const template = `# Auto-generated hut config\n# Fill in miners.targets with your IP mapping (A01.. etc).\n\n# Stable identity for this hut (recommended)\nhutCode: ${args.hutCode}\nagentId: ${agentId}\n\napi:\n  url: ${apiUrl}\n\nintervalSeconds: ${intervalSeconds}\n\ncollectors:\n  hut:\n    enabled: true\n\n    miners:\n      enabled: true\n\n      # Example:\n      # targets:\n      #   - name: A01\n      #     host: 192.168.1.101\n      #     port: 4028\n      targets: []\n\n      mockMiners:\n        enabled: false\n        count: 48\n\nwell:\n  enabled: false\n`

  fs.writeFileSync(cfgPath, template, 'utf8')
  console.log(`Wrote ${cfgPath}`)
}

const bootstrapApi = async (args: Args) => {
  const apiUrl = args.apiUrl ?? process.env.AGENT_API_URL
  if (!apiUrl) {
    console.error('Missing --api <API_URL> (or AGENT_API_URL) for --bootstrap')
    process.exit(2)
  }

  // 1) ensure hut exists
  await fetch(`${apiUrl}/v1/huts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: args.hutCode, name: args.hutCode })
  }).catch(() => {
    /* ignore if already exists or route differs */
  })

  if (!args.assignSiteCode) {
    console.log('Bootstrap: hut created (or already exists). No --site provided, skipping assignment.')
    return
  }

  // 2) find siteId by code
  const sitesRes = await fetch(`${apiUrl}/v1/sites`)
  if (!sitesRes.ok) {
    console.error(`Failed to list sites: ${sitesRes.status}`)
    process.exit(1)
  }
  const sites = (await sitesRes.json()) as Array<{ id: string; code: string }>
  const site = sites.find((s) => s.code === args.assignSiteCode)
  if (!site) {
    console.error(`Site not found: ${args.assignSiteCode}`)
    process.exit(1)
  }

  // 3) assign hut -> site
  const assignRes = await fetch(
    `${apiUrl}/v1/huts/by-code/${encodeURIComponent(args.hutCode)}/assign`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ siteId: site.id })
    }
  )

  if (!assignRes.ok) {
    console.error(`Failed to assign hut: ${assignRes.status}`)
    process.exit(1)
  }
  console.log(`Assigned hut ${args.hutCode} -> site ${args.assignSiteCode}`)
}

const main = async () => {
  const args = parseArgs()
  writeConfig(args)
  if (args.bootstrap) await bootstrapApi(args)
}

main().catch((e) => {
  console.error(String(e?.message ?? e))
  process.exit(1)
})
