import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ hutCode: string }> }
) {
  const { hutCode } = await ctx.params
  const apiBase =
    process.env.OPS_API_BASE ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3002'

  const url = new URL(
    `${apiBase}/v1/huts/${encodeURIComponent(hutCode)}/miners/hourly`
  )

  const reqUrl = new URL(_req.url)
  reqUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return NextResponse.json([], { status: 200 })

  return NextResponse.json(await res.json(), { status: 200 })
}
