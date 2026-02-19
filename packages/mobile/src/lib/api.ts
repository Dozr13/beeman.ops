import Constants from 'expo-constants'
import { getApiUrl, getReadKey } from './storage'

const API_VERSION_PREFIX = '/v1'

type ApiError = {
  status: number
  message: string
  details?: unknown
}

const normalizeBaseUrl = (u: string) => u.replace(/\/+$/, '').replace(/\/v1\/?$/, '')

const getBaseUrl = async () => {
  const fromSettings = await getApiUrl()
  const fromEnv = (Constants.expoConfig?.extra as any)?.apiUrl as string | undefined
  const base = fromSettings || fromEnv || ''
  if (!base) throw new Error('Missing API URL. Set it in Settings.')
  return normalizeBaseUrl(base)
}

const isDev = __DEV__

export const apiFetch = async <T>(
  path: string,
  opts?: { method?: string; body?: unknown; requireReadKey?: boolean }
): Promise<T> => {
  const baseUrl = await getBaseUrl()
  const pathWithLeadingSlash = path.startsWith('/') ? path : `/${path}`
  const url = `${baseUrl}${API_VERSION_PREFIX}${pathWithLeadingSlash}`
  const method = opts?.method ?? 'GET'
  const headers: Record<string, string> = { 'content-type': 'application/json' }

  if (opts?.requireReadKey) {
    const readKey = await getReadKey()
    if (!readKey) throw new Error('Missing OPS_READ_KEY. Set it in Settings.')
    headers['x-ops-read-key'] = readKey
  }

  if (isDev) {
    console.log(`[API] ${method} ${url}`)
  }

  const res = await fetch(url, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : undefined

  if (isDev) {
    console.log(`[API] ${method} ${url} → ${res.status}`)
    if (!res.ok && json) {
      console.warn('[API] error response:', json)
    }
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: (json && (json.message || json.error)) || res.statusText,
      details: json
    }
    throw Object.assign(new Error(err.message), { api: err })
  }

  return json as T
}
