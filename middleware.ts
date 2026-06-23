import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'bus_session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through public routes immediately
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // If no session cookie, redirect to login
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Cookie present — let the page's getSession() do full JWT verification
  // and handle role-based access (redirect to /login if role mismatch)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
