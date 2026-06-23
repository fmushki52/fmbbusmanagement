import { createEvent } from '@/lib/actions/events'
import Link from 'next/link'

export default function NewEventPage() {
  return (
    <>
      <div className="mb-4">
        <h2 className="h3 fw-bold">New Event</h2>
      </div>
      <div className="card border-0 shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body p-4">
          <form action={createEvent} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label fw-medium" htmlFor="name">Event Name *</label>
              <input id="name" name="name" required className="form-control" placeholder="e.g. Annual Conference 2025" />
            </div>
            <div>
              <label className="form-label fw-medium" htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={3} className="form-control" placeholder="Optional description" />
            </div>
            <div>
              <label className="form-label fw-medium" htmlFor="eventDate">Event Date</label>
              <input id="eventDate" name="eventDate" type="date" className="form-control" />
            </div>
            <div className="d-flex gap-2 pt-2">
              <button type="submit" className="btn btn-primary">Create Event</button>
              <Link href="/admin/events" className="btn btn-outline-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
