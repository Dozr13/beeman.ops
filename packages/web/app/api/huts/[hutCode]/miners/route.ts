import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ hutCode: string }> }
) {
  const { hutCode } = await ctx.params

  const apiBase =
    process.env.OPS_API_BASE ??
    // keep if you want, but prefer OPS_API_BASE for server-only
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3002'

  const url = `${apiBase}/v1/huts/${encodeURIComponent(hutCode)}/miners`

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 10_000)

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ctrl.signal
    })

    const txt = await res.text().catch(() => '')

    if (!res.ok) {
      return NextResponse.json(
        { error: 'upstream_failed', status: res.status, body: txt },
        { status: 502 }
      )
    }

    return new NextResponse(txt, {
      status: 200,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json'
      }
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'upstream_unreachable', message: e?.message ?? 'fetch failed' },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
