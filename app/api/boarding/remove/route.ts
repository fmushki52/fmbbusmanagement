import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { passengers, userBuses, auditLog } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'user' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { passengerId } = await req.json()

  const [passenger] = await db.select().from(passengers).where(eq(passengers.id, passengerId)).limit(1)
  if (!passenger || !passenger.seatedBusId) {
    return NextResponse.json({ error: 'Passenger not seated' }, { status: 400 })
  }

  // User may only remove from their own bus
  if (session.role !== 'admin') {
    const [mapping] = await db
      .select()
      .from(userBuses)
      .where(and(eq(userBuses.userId, session.userId), eq(userBuses.busId, passenger.seatedBusId!)))
      .limit(1)
    if (!mapping) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  }

  const prevBusId = passenger.seatedBusId

  await db.update(passengers)
    .set({ seatedBusId: null, seatedAt: null, seatedBy: null })
    .where(eq(passengers.id, passengerId))

  await db.insert(auditLog).values({
    eventId: passenger.eventId,
    busId: prevBusId,
    passengerId,
    action: 'remove',
    performedBy: session.userId,
    note: `Removed from bus`,
  })

  return NextResponse.json({ ok: true })
}
