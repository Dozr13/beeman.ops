import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const isPublicFile = (pathname: string) =>
  pathname.startsWith('/_next') ||
  pathname.startsWith('/favicon') ||
  pathname.startsWith('/robots.txt') ||
  pathname.startsWith('/sitemap.xml') ||
  pathname.startsWith('/assets') ||
  pathname.endsWith('.png') ||
  pathname.endsWith('.jpg') ||
  pathname.endsWith('.jpeg') ||
  pathname.endsWith('.svg') ||
  pathname.endsWith('.ico')

const isPublicPath = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/login') ||
  pathname.startsWith('/api/auth') ||
  isPublicFile(pathname)

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (isPublicPath(pathname)) return NextResponse.next()

  // protect only “app” routes
  const needsAuth =
    pathname.startsWith('/sites') || pathname.startsWith('/huts')

  if (!needsAuth) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*']
}
