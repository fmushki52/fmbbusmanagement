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
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="py-3 px-3">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/buses?eventId=${eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <div>
          <h2 className="h4 fw-bold mb-0">Add Bus</h2>
          <small className="text-muted">{event.name}</small>
        </div>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={createBus} className="d-flex flex-column gap-3">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label fw-semibold">Bus Number <span className="text-danger">*</span></label>
                <input name="busNumber" required className="form-control" placeholder="1" inputMode="numeric" />
              </div>
              <div className="col-6">
                <label className="form-label fw-semibold">Bus Name <span className="text-danger">*</span></label>
                <input name="busName" required className="form-control" placeholder="Bus 1" />
              </div>
            </div>
            <div>
              <label className="form-label fw-semibold">Group Leader Name <span className="text-danger">*</span></label>
              <input name="groupLeaderName" required className="form-control" />
            </div>
            <div>
              <label className="form-label fw-semibold">Group Leader Contact <span className="text-danger">*</span></label>
              <input name="groupLeaderContact" required className="form-control" placeholder="+965 XXXX XXXX" />
            </div>
            <div>
              <label className="form-label fw-semibold">Capacity <span className="text-danger">*</span></label>
              <input name="capacity" type="number" min="1" required className="form-control" placeholder="45" />
            </div>
            <div className="d-flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary px-4">Add Bus</button>
              <Link href={`/admin/buses?eventId=${eventId}`} className="btn btn-outline-secondary px-4">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
