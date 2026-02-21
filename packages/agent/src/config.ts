// packages/agent/src/config.ts
import { load as loadYaml } from 'js-yaml'
import fs from 'node:fs'
import path from 'node:path'

type YamlDoc = Record<string, unknown>

/**
 * Resolve a config file path robustly:
 * - If `p` is absolute, use it.
 * - Otherwise resolve relative to `cwd` (when user passes a relative path),
 *   OR relative to agent package dir (for defaults).
 */
export const loadConfig = (p: string, seen = new Set<string>()): YamlDoc => {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
  if (seen.has(abs)) throw new Error(`Config include cycle detected at: ${abs}`)
  seen.add(abs)

  const raw = fs.readFileSync(abs, 'utf-8')
  const doc = (loadYaml(raw) ?? {}) as unknown

  // Coerce to object shape
  const obj: YamlDoc =
    doc && typeof doc === 'object' && !Array.isArray(doc)
      ? (doc as YamlDoc)
      : {}

  const includeRaw = obj['include']
  const include = typeof includeRaw === 'string' ? includeRaw.trim() : ''

  if (include) {
    const incPath = path.isAbsolute(include)
      ? include
      : path.resolve(path.dirname(abs), include)

    const base: YamlDoc = loadConfig(incPath, seen)

    // remove include key, allow current file to override included values
    const { include: _ignored, ...rest } = obj as any
    return { ...base, ...(rest as YamlDoc) }
  }

  return obj
}

export const fileExists = (p: string) => {
  try {
    fs.accessSync(p, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

export const resolveConfigPath = (opts: {
  envPath?: string
  argPath?: string
  defaultFileName?: string
  agentPackageDir: string
  repoRootDir?: string
}) => {
  const candidates: string[] = []

  const { envPath, argPath, defaultFileName, agentPackageDir, repoRootDir } =
    opts

  const addRel = (p: string) => {
    // Try multiple bases so the agent works no matter where it’s launched from
    candidates.push(path.resolve(process.cwd(), p))
    candidates.push(path.resolve(agentPackageDir, p))
    if (repoRootDir) candidates.push(path.resolve(repoRootDir, p))
  }

  // 1) CLI arg wins (if provided)
  if (argPath) {
    if (path.isAbsolute(argPath)) candidates.push(argPath)
    else addRel(argPath)
  }

  // 2) Env var next
  if (envPath) {
    if (path.isAbsolute(envPath)) candidates.push(envPath)
    else addRel(envPath)
  }

  // 3) Default in agent package dir (robust for turbo)
  if (defaultFileName) {
    candidates.push(path.join(agentPackageDir, defaultFileName))
  }

  const hit = candidates.find(fileExists)
  if (!hit) {
    const msg =
      `Agent config not found. Tried:\\n` +
      candidates.map((c) => `- ${c}`).join('\\n')
    throw new Error(msg)
  }

  return hit
}
