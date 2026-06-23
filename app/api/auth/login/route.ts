import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const attempts = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) { attempts.set(ip, { count: 1, resetAt: now + 60_000 }); return true }
  if (entry.count >= 10) return false
  entry.count++; return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 })
    }

    let body: { username?: string; password?: string }
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { username, password } = body
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession({
      userId: user.id,
      username: user.username,
      role: user.role as 'admin' | 'user' | 'reporter',
    })

    const response = NextResponse.json({ role: user.role })
    response.cookies.set('bus_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err: any) {
    // Return full error detail in dev so we can diagnose
    console.error('Login error:', err)
    return NextResponse.json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV !== 'production' ? String(err?.message ?? err) : undefined,
    }, { status: 500 })
  }
}
