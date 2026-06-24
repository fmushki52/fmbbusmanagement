import { db } from '@/lib/db'
import { buses, events, passengers, users } from '@/lib/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'

export async function getEventSummaryData(eventId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return null

  const busList = await db.select().from(buses).where(eq(buses.eventId, eventId))
    .orderBy(sql`CAST(${buses.busNumber} AS INTEGER)`)

  const seatCountsRaw = await db
    .select({ busId: passengers.seatedBusId, seated: count() })
    .from(passengers)
    .where(and(sql`${passengers.seatedBusId} is not null`, eq(passengers.eventId, eventId)))
    .groupBy(passengers.seatedBusId)
  const seatCounts = Object.fromEntries(seatCountsRaw.map((r) => [r.busId!, r.seated]))

  const unseatedPassengers = await db
    .select()
    .from(passengers)
    .where(and(eq(passengers.eventId, eventId), sql`${passengers.seatedBusId} is null`))
    .orderBy(passengers.name)

  return {
    event,
    buses: busList.map((b) => ({
      ...b,
      seated: seatCounts[b.id] ?? 0,
      remaining: b.capacity - (seatCounts[b.id] ?? 0),
    })),
    unseatedPassengers,
  }
}

export async function getBusReportData(busId: string) {
  const [bus] = await db.select().from(buses).where(eq(buses.id, busId)).limit(1)
  if (!bus) return null

  const [event] = await db.select().from(events).where(eq(events.id, bus.eventId)).limit(1)
  if (!event) return null

  const passengerList = await db
    .select({
      id: passengers.id,
      refId: passengers.refId,
      name: passengers.name,
      gender: passengers.gender,
      age: passengers.age,
      assignedBusId: passengers.assignedBusId,
      seatedBusId: passengers.seatedBusId,
      seatedAt: passengers.seatedAt,
      confirmedBy: users.username,
    })
    .from(passengers)
    .leftJoin(users, eq(passengers.seatedBy, users.id))
    .where(
      and(
        eq(passengers.eventId, bus.eventId),
        sql`(${passengers.assignedBusId} = ${busId} OR ${passengers.seatedBusId} = ${busId})`
      )
    )
    .orderBy(passengers.name)

  const [{ seated }] = await db
    .select({ seated: count() })
    .from(passengers)
    .where(eq(passengers.seatedBusId, busId))

  return { bus, event, passengers: passengerList, seated: Number(seated) }
}
