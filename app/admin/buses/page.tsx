import { db } from '@/lib/db'
import { buses, events, passengers } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'
import Link from 'next/link'
import { DeleteBusButton } from './DeleteBusButton'

export const dynamic = 'force-dynamic'

export default async function BusesPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams

  const eventList = await db.select().from(events).orderBy(sql`${events.name}`)
  const selectedEvent = eventId ? eventList.find((e) => e.id === eventId) : eventList[0]

  const busList = selectedEvent
    ? await db.select().from(buses).where(eq(buses.eventId, selectedEvent.id)).orderBy(buses.busNumber)
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
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="h3 fw-bold mb-0">Buses</h2>
        {selectedEvent && (
          <Link href={`/admin/buses/new?eventId=${selectedEvent.id}`} className="btn btn-primary">+ Add Bus</Link>
        )}
      </div>

      {/* Event picker */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-2">
          <div className="d-flex gap-2 flex-wrap">
            {eventList.map((e) => (
              <Link
                key={e.id}
                href={`/admin/buses?eventId=${e.id}`}
                className={`btn btn-sm rounded-pill ${selectedEvent?.id === e.id ? 'btn-primary' : 'btn-outline-secondary'}`}
              >
                {e.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {selectedEvent?.status === 'archived' && (
        <div className="alert alert-warning d-flex align-items-center mb-4">
          <span className="me-2">⚠</span> This event is archived — read-only.
        </div>
      )}

      {/* Buses grid */}
      <div className="row g-3">
        {busList.map((bus) => {
          const seated = seatCounts[bus.id] ?? 0
          const pct = Math.round((seated / bus.capacity) * 100)
          const isFull = seated >= bus.capacity
          const barClass = isFull ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-primary'
          return (
            <div key={bus.id} className="col-12 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="fw-bold fs-5">#{bus.busNumber}</span>
                      <span className="text-muted ms-2">{bus.busName}</span>
                      <div className="small text-muted mt-1">👤 {bus.groupLeaderName} · {bus.groupLeaderContact}</div>
                    </div>
                    {selectedEvent?.status === 'active' && (
                      <div className="d-flex gap-1">
                        <Link href={`/admin/buses/${bus.id}/edit`} className="btn btn-sm btn-outline-secondary">Edit</Link>
                        <DeleteBusButton busId={bus.id} busNumber={bus.busNumber} />
                      </div>
                    )}
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>{seated} / {bus.capacity} seated</span>
                    <span className={isFull ? 'text-danger fw-bold' : ''}>{isFull ? 'FULL' : `${bus.capacity - seated} left`}</span>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div className={`progress-bar ${barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedEvent && busList.length === 0 && (
        <div className="card border-0 shadow-sm mt-3">
          <div className="card-body text-center py-5 text-muted">
            <div className="fs-1 mb-2">🚌</div>
            <p className="mb-3">No buses for this event.</p>
            <Link href={`/admin/buses/new?eventId=${selectedEvent.id}`} className="btn btn-primary">
              Add First Bus
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
