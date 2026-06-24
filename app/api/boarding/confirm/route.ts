import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getTxDb, db } from '@/lib/db'
import { userBuses } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const confirmAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = confirmAttempts.get(userId)
  if (!entry || entry.resetAt < now) {
    confirmAttempts.set(userId, { count: 1, resetAt: now + 10_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'user' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!checkRateLimit(session.userId)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { passengerId, busId } = await req.json()
  if (!passengerId || !busId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  if (session.role !== 'admin') {
    const [mapping] = await db
      .select()
      .from(userBuses)
      .where(and(eq(userBuses.userId, session.userId), eq(userBuses.busId, busId)))
      .limit(1)
    if (!mapping) return NextResponse.json({ error: 'Not authorized for this bus' }, { status: 403 })
  }

  const txDb = getTxDb()
  try {
    const result = await txDb.transaction(async (tx) => {
      const busResult = await tx.execute(sql`SELECT * FROM buses WHERE id = ${busId} FOR UPDATE`)
      const bus = (busResult as any).rows?.[0] ?? (busResult as any)[0]
      if (!bus) throw new Error('Bus not found')

      const eventResult = await tx.execute(sql`SELECT status FROM events WHERE id = ${bus.event_id}`)
      const event = (eventResult as any).rows?.[0] ?? (eventResult as any)[0]
      if (event?.status === 'archived') throw new Error('Event is archived')

      const countResult = await tx.execute(
        sql`SELECT count(*)::int as cnt FROM passengers WHERE seated_bus_id = ${busId}`
      )
      const countRow = (countResult as any).rows?.[0] ?? (countResult as any)[0]
      const seated = Number(countRow?.cnt ?? 0)
      if (seated >= bus.capacity) throw new Error('Bus full')

      const pResult = await tx.execute(sql`SELECT * FROM passengers WHERE id = ${passengerId} FOR UPDATE`)
      const p = (pResult as any).rows?.[0] ?? (pResult as any)[0]
      if (!p) throw new Error('Passenger not found')

      if (p.seated_bus_id && p.seated_bus_id !== busId) {
        const otherResult = await tx.execute(sql`SELECT bus_number FROM buses WHERE id = ${p.seated_bus_id}`)
        const otherBus = (otherResult as any).rows?.[0] ?? (otherResult as any)[0]
        throw new Error(`Already seated on Bus #${otherBus?.bus_number ?? '?'}`)
      }

      if (p.seated_bus_id === busId) return { status: 'already_boarded' }

      const action = p.assigned_bus_id && p.assigned_bus_id !== busId ? 'reassign' : 'board'

      await tx.execute(
        sql`UPDATE passengers SET seated_bus_id = ${busId}, seated_at = now(), seated_by = ${session.userId} WHERE id = ${passengerId}`
      )
      await tx.execute(
        sql`INSERT INTO audit_log (id, event_id, bus_id, passenger_id, action, performed_by, note)
            VALUES (gen_random_uuid(), ${p.event_id}, ${busId}, ${passengerId}, ${action}, ${session.userId}, ${action === 'reassign' ? 'Reassigned' : 'Boarded'})`
      )

      return { status: 'ok', action, remaining: bus.capacity - seated - 1 }
    })
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err.message ?? 'Transaction failed'
    if (msg === 'Bus full' || msg.startsWith('Already seated') || msg === 'Event is archived') {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    console.error('Boarding error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
