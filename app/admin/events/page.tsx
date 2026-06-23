import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const eventList = await db.select().from(events).orderBy(sql`${events.createdAt} desc`)

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="h3 fw-bold mb-0">Events</h2>
        <Link href="/admin/events/new" className="btn btn-primary">+ New Event</Link>
      </div>
      <div className="row g-3">
        {eventList.map((event) => (
          <div key={event.id} className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h5 className="mb-0 fw-semibold">{event.name}</h5>
                    <span className={`badge ${event.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{event.status}</span>
                  </div>
                  {event.eventDate && <div className="small text-muted">📅 {event.eventDate}</div>}
                  {event.description && <div className="small text-muted">{event.description}</div>}
                </div>
                <div className="d-flex gap-2">
                  <Link href={`/admin/events/${event.id}/edit`} className="btn btn-sm btn-outline-secondary">Edit</Link>
                  <Link href={`/admin/buses?eventId=${event.id}`} className="btn btn-sm btn-outline-primary">Buses</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
        {eventList.length === 0 && (
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5 text-muted">
                <div className="fs-1 mb-2">📅</div>
                <p className="mb-3">No events yet.</p>
                <Link href="/admin/events/new" className="btn btn-primary">Create First Event</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
