import { NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await ctx.params

  const res = await fetch(
    `${API}/v1/sites/${encodeURIComponent(siteId)}/devices`,
    { cache: 'no-store' }
  )

  const text = await res.text().catch(() => '')
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json'
    }
  })
}
