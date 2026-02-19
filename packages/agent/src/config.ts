// packages/agent/src/config.ts
import { load as loadYaml } from 'js-yaml'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Resolve a config file path robustly:
 * - If `p` is absolute, use it.
 * - Otherwise resolve relative to `cwd` (when user passes a relative path),
 *   OR relative to agent package dir (for defaults).
 */
export const loadConfig = (p: string) => {
  const raw = fs.readFileSync(p, 'utf-8')
  return loadYaml(raw) as any
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
}) => {
  const candidates: string[] = []

  const { envPath, argPath, defaultFileName, agentPackageDir } = opts

  // 1) CLI arg wins (if provided)
  if (argPath) {
    candidates.push(
      path.isAbsolute(argPath) ? argPath : path.resolve(process.cwd(), argPath)
    )
  }

  // 2) Env var next
  if (envPath) {
    candidates.push(
      path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath)
    )
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
