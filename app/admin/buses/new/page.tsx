import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createBus } from '@/lib/actions/buses'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function NewBusPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/buses?eventId=${eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <div>
          <h2 className="h4 fw-bold mb-0">Add Bus</h2>
          <small className="text-muted">{event.name}</small>
        </div>
      </div>
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">🚌 Bus Details</h6>
        </div>
        <div className="card-body p-4">
          <form action={createBus}>
            <input type="hidden" name="eventId" value={eventId} />
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label" htmlFor="busNumber">Bus # <span className="text-danger">*</span></label>
                <input id="busNumber" name="busNumber" required className="form-control" placeholder="1" />
              </div>
              <div className="col-6">
                <label className="form-label" htmlFor="busName">Bus Name <span className="text-danger">*</span></label>
                <input id="busName" name="busName" required className="form-control" placeholder="Alpha" />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="groupLeaderName">Leader Name <span className="text-danger">*</span></label>
              <input id="groupLeaderName" name="groupLeaderName" required className="form-control" />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="groupLeaderContact">Leader Contact <span className="text-danger">*</span></label>
              <input id="groupLeaderContact" name="groupLeaderContact" required className="form-control" placeholder="+965 9999 9999" />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="capacity">Capacity <span className="text-danger">*</span></label>
              <input id="capacity" name="capacity" type="number" min="1" required className="form-control" placeholder="45" />
            </div>
            <div className="d-grid gap-2 d-sm-flex">
              <button type="submit" className="btn btn-primary flex-sm-fill">Add Bus</button>
              <Link href={`/admin/buses?eventId=${eventId}`} className="btn btn-outline-secondary flex-sm-fill text-center">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
