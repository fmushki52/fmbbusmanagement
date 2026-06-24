import { db } from '@/lib/db'
import { buses, events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { createPassenger } from '@/lib/actions/passengers'
import Link from 'next/link'

export default async function NewPassengerPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  const busList = await db.select().from(buses).where(eq(buses.eventId, eventId)).orderBy(buses.busNumber)

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/passengers?eventId=${eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <div>
          <h2 className="h4 fw-bold mb-0">Add Passenger</h2>
          <small className="text-muted">{event.name}</small>
        </div>
      </div>
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">👤 Passenger Details</h6>
        </div>
        <div className="card-body p-4">
          <form action={createPassenger}>
            <input type="hidden" name="eventId" value={eventId} />
            <div className="mb-3">
              <label className="form-label" htmlFor="refId">Ref ID <span className="text-danger">*</span></label>
              <input id="refId" name="refId" required className="form-control" placeholder="Member/ID number" />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="name">Full Name <span className="text-danger">*</span></label>
              <input id="name" name="name" required className="form-control" />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label" htmlFor="gender">Gender</label>
                <select id="gender" name="gender" className="form-select">
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label" htmlFor="age">Age</label>
                <input id="age" name="age" type="number" min="0" max="120" className="form-control" />
              </div>
            </div>
            {busList.length > 0 && (
              <div className="mb-4">
                <label className="form-label" htmlFor="assignedBusId">Assign to Bus</label>
                <select id="assignedBusId" name="assignedBusId" className="form-select">
                  <option value="">No assignment</option>
                  {busList.map((b) => (
                    <option key={b.id} value={b.id}>#{b.busNumber} – {b.busName}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="d-grid gap-2 d-sm-flex">
              <button type="submit" className="btn btn-primary flex-sm-fill">Add Passenger</button>
              <Link href={`/admin/passengers?eventId=${eventId}`} className="btn btn-outline-secondary flex-sm-fill text-center">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
