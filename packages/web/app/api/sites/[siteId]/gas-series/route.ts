import { API_URL } from '@/lib/api'
import type { NextRequest } from 'next/server'

type Ctx = {
  params: Promise<{ siteId: string }>
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { siteId } = await ctx.params

  const url = new URL(
    `${API_URL}/v1/sites/${encodeURIComponent(siteId)}/gas-series`
  )

  // pass through range
  const days = req.nextUrl.searchParams.get('days')
  if (days) url.searchParams.set('days', days)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const text = await res.text()

  return new Response(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json'
    }
  })
}
