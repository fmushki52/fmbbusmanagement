import { createEvent } from '@/lib/actions/events'
import Link from 'next/link'

export default function NewEventPage() {
  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href="/admin/events" className="btn btn-sm btn-outline-secondary">← Back</Link>
        <h2 className="h4 fw-bold mb-0">New Event</h2>
      </div>
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">📅 Event Details</h6>
        </div>
        <div className="card-body p-4">
          <form action={createEvent}>
            <div className="mb-3">
              <label className="form-label" htmlFor="name">Event Name <span className="text-danger">*</span></label>
              <input id="name" name="name" required className="form-control" placeholder="e.g. Annual Conference 2025" />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={3} className="form-control" placeholder="Optional description" />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="eventDate">Event Date</label>
              <input id="eventDate" name="eventDate" type="date" className="form-control" />
            </div>
            <div className="d-grid gap-2 d-sm-flex">
              <button type="submit" className="btn btn-primary flex-sm-fill">Create Event</button>
              <Link href="/admin/events" className="btn btn-outline-secondary flex-sm-fill text-center">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
