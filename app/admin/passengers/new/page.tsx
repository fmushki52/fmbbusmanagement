import { db } from '@/lib/db'
import { buses, events } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { createPassenger } from '@/lib/actions/passengers'
import Link from 'next/link'

export default async function NewPassengerPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  const busList = await db.select().from(buses).where(eq(buses.eventId, eventId))
    .orderBy(sql`CAST(${buses.busNumber} AS INTEGER)`)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="py-3 px-3">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/passengers?eventId=${eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <div>
          <h2 className="h4 fw-bold mb-0">Add Passenger</h2>
          <small className="text-muted">{event.name}</small>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={createPassenger} className="d-flex flex-column gap-3">
            <input type="hidden" name="eventId" value={eventId} />

            <div>
              <label htmlFor="refId" className="form-label fw-semibold">Ref ID <span className="text-danger">*</span></label>
              <input
                id="refId" name="refId" required className="form-control"
                placeholder="Numeric ID" inputMode="numeric" pattern="[0-9]*"
                onInput={(e: any) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
              />
            </div>

            <div>
              <label htmlFor="name" className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
              <input id="name" name="name" required className="form-control" placeholder="Enter full name" />
            </div>

            <div className="row g-3">
              <div className="col-6">
                <label htmlFor="gender" className="form-label fw-semibold">Gender</label>
                <select id="gender" name="gender" className="form-select">
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-6">
                <label htmlFor="age" className="form-label fw-semibold">Age</label>
                <input id="age" name="age" type="number" min="0" max="120" className="form-control" placeholder="Age" />
              </div>
            </div>

            {busList.length > 0 && (
              <div>
                <label htmlFor="assignedBusId" className="form-label fw-semibold">Assign to Bus</label>
                <select id="assignedBusId" name="assignedBusId" className="form-select">
                  <option value="">No assignment</option>
                  {busList.map((b) => (
                    <option key={b.id} value={b.id}>#{b.busNumber} – {b.busName}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="d-flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary px-4">Add Passenger</button>
              <Link href={`/admin/passengers?eventId=${eventId}`} className="btn btn-outline-secondary px-4">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
