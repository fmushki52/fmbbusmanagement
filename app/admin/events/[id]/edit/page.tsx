import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { updateEvent, archiveEvent } from '@/lib/actions/events'
import Link from 'next/link'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  if (!event) notFound()

  const update = updateEvent.bind(null, id)

  return (
    <>
      <div className="mb-4">
        <h2 className="h3 fw-bold">Edit Event</h2>
      </div>
      <div className="card border-0 shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body p-4">
          <form action={update} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label fw-medium">Event Name *</label>
              <input name="name" required defaultValue={event.name} className="form-control" />
            </div>
            <div>
              <label className="form-label fw-medium">Description</label>
              <textarea name="description" rows={3} defaultValue={event.description ?? ''} className="form-control" />
            </div>
            <div>
              <label className="form-label fw-medium">Event Date</label>
              <input name="eventDate" type="date" defaultValue={event.eventDate ?? ''} className="form-control" />
            </div>
            <div>
              <label className="form-label fw-medium">Status</label>
              <select name="status" defaultValue={event.status} className="form-select">
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="d-flex gap-2 pt-2">
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <Link href="/admin/events" className="btn btn-outline-secondary">Cancel</Link>
            </div>
          </form>

          {event.status === 'active' && (
            <div className="mt-4 pt-4 border-top">
              <p className="small text-muted mb-2">Danger zone</p>
              <form action={archiveEvent.bind(null, id)}>
                <button type="submit" className="btn btn-sm btn-outline-warning">Archive Event</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
