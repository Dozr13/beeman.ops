import { NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

console.log('API NEXT - ', API)

export async function GET() {
  const res = await fetch(`${API}/v1/huts`, { cache: 'no-store' })
  const text = await res.text().catch(() => '')
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json'
    }
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const res = await fetch(`${API}/v1/huts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  })

  const text = await res.text().catch(() => '')
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json'
    }
  })
}
