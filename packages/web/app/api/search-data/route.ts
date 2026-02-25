import { NextResponse } from 'next/server'

const apiBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL
  const v = typeof raw === 'string' ? raw.trim() : ''
  const base = v.length > 0 ? v : 'http://localhost:3002'
  return base.replace(/\/$/, '')
}

export const GET = async () => {
  const base = apiBase()

  const [sitesRes, hutsRes] = await Promise.all([
    fetch(`${base}/v1/sites`, { cache: 'no-store' }),
    fetch(`${base}/v1/huts`, { cache: 'no-store' })
  ])

  if (!sitesRes.ok) {
    return NextResponse.json(
      { error: `sites ${sitesRes.status}` },
      { status: 500 }
    )
  }
  if (!hutsRes.ok) {
    return NextResponse.json(
      { error: `huts ${hutsRes.status}` },
      { status: 500 }
    )
  }

  const [sites, huts] = await Promise.all([sitesRes.json(), hutsRes.json()])
  return NextResponse.json({ sites, huts })
}
