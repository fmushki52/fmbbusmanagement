import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
const COOKIE_NAME = 'bus_session'

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) return new TextEncoder().encode('fallback-secret-change-me')
  return new TextEncoder().encode(secret)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, getSecret())
    const role = payload.role as string

    // Admin can access everything
    if (role === 'admin') return NextResponse.next()

    // Role-based routing
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/app') && role !== 'user') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/reports') && role !== 'reporter') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
