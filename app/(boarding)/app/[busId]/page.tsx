import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { buses, events, passengers, userBuses, users } from '@/lib/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'
import { NavBar } from '@/components/ui/NavBar'
import { BoardingScreen } from '@/components/boarding/BoardingScreen'

export const dynamic = 'force-dynamic'

export default async function BusBoardingPage({ params }: { params: Promise<{ busId: string }> }) {
  const { busId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  // Verify access
  if (session.role !== 'admin') {
    const [mapping] = await db
      .select()
      .from(userBuses)
      .where(and(eq(userBuses.userId, session.userId), eq(userBuses.busId, busId)))
      .limit(1)
    if (!mapping) notFound()
  }

  const [bus] = await db
    .select()
    .from(buses)
    .where(eq(buses.id, busId))
    .limit(1)
  if (!bus) notFound()

  const [event] = await db.select().from(events).where(eq(events.id, bus.eventId)).limit(1)
  if (!event) notFound()

  // Seat count
  const [{ seated }] = await db
    .select({ seated: count() })
    .from(passengers)
    .where(eq(passengers.seatedBusId, busId))

  // Pre-assigned passengers for roster tab
  const assignedPassengers = await db
    .select()
    .from(passengers)
    .where(and(eq(passengers.assignedBusId, busId), eq(passengers.eventId, bus.eventId)))
    .orderBy(passengers.name)

  // Seated passengers on this bus
  const seatedPassengers = await db
    .select({
      id: passengers.id,
      name: passengers.name,
      refId: passengers.refId,
      gender: passengers.gender,
      age: passengers.age,
      seatedAt: passengers.seatedAt,
      seatedByUsername: users.username,
    })
    .from(passengers)
    .leftJoin(users, eq(passengers.seatedBy, users.id))
    .where(eq(passengers.seatedBusId, busId))
    .orderBy(sql`${passengers.seatedAt} desc`)

  // Check if any assignments exist for this event
  const [{ total: totalAssignments }] = await db
    .select({ total: count() })
    .from(passengers)
    .where(and(eq(passengers.eventId, bus.eventId), sql`${passengers.assignedBusId} is not null`))

  return (
    <>
      <NavBar role={session.role} username={session.username} />
      <BoardingScreen
        bus={bus}
        event={event}
        seated={seated}
        assignedPassengers={assignedPassengers}
        seatedPassengers={seatedPassengers}
        hasAnyAssignments={totalAssignments > 0}
        session={session}
      />
    </>
  )
}
