export const API_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL
  const v = typeof raw === 'string' ? raw.trim() : ''
  const base = v.length > 0 ? v : 'http://localhost:3002'
  return base.replace(/\/$/, '')
})()

export const apiGet = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json() as any
}

export const apiPost = async <T>(path: string, body: any): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json() as any
}
