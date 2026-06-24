import { db } from '@/lib/db'
import { buses, events, passengers } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'
import Link from 'next/link'
import { BusInlineEdit } from './BusInlineEdit'

export const dynamic = 'force-dynamic'

export default async function BusesPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams

  const eventList = await db.select().from(events).orderBy(sql`${events.name}`)
  const selectedEvent = eventId ? eventList.find((e) => e.id === eventId) : eventList[0]

  const busList = selectedEvent
    ? await db.select().from(buses).where(eq(buses.eventId, selectedEvent.id))
        .orderBy(sql`CAST(${buses.busNumber} AS INTEGER)`)
    : []

  const seatCountsRaw = selectedEvent
    ? await db
        .select({ busId: passengers.seatedBusId, seated: count() })
        .from(passengers)
        .where(sql`${passengers.seatedBusId} is not null AND ${passengers.eventId} = ${selectedEvent.id}`)
        .groupBy(passengers.seatedBusId)
    : []
  const seatCounts = Object.fromEntries(seatCountsRaw.map((r) => [r.busId!, r.seated]))

  return (
    <div className="pb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h2 className="h4 fw-bold mb-0">Buses</h2>
        {selectedEvent && selectedEvent.status === 'active' && (
          <div className="d-flex gap-2">
            <Link href={`/admin/buses/import?eventId=${selectedEvent.id}`} className="btn btn-outline-secondary btn-sm">
              Import CSV/Excel
            </Link>
            <Link href={`/admin/buses/new?eventId=${selectedEvent.id}`} className="btn btn-primary btn-sm">
              + Add Bus
            </Link>
          </div>
        )}
      </div>

      {/* Event picker */}
      <div className="d-flex gap-2 overflow-auto mb-3 pb-1">
        {eventList.map((e) => (
          <Link
            key={e.id}
            href={`/admin/buses?eventId=${e.id}`}
            className={`btn btn-sm flex-shrink-0 ${selectedEvent?.id === e.id ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            {e.name}
          </Link>
        ))}
      </div>

      {selectedEvent && selectedEvent.status === 'archived' && (
        <div className="alert alert-warning py-2 small mb-3">This event is archived — read-only.</div>
      )}

      {selectedEvent && (
        <BusInlineEdit
          buses={busList}
          seatCounts={seatCounts}
          eventId={selectedEvent.id}
          isArchived={selectedEvent.status === 'archived'}
        />
      )}
    </div>
  )
}
