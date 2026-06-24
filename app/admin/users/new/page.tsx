import { db } from '@/lib/db'
import { buses, events } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { createUser } from '@/lib/actions/users'
import Link from 'next/link'

export default async function NewUserPage() {
  const eventList = await db.select().from(events).where(eq(events.status, 'active')).orderBy(sql`${events.name}`)
  const busList = await db.select().from(buses).orderBy(buses.busNumber)
  const busesByEvent = eventList.map((e) => ({
    event: e,
    buses: busList.filter((b) => b.eventId === e.id),
  }))

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href="/admin/users" className="btn btn-sm btn-outline-secondary">← Back</Link>
        <h2 className="h4 fw-bold mb-0">New User</h2>
      </div>
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">🔐 User Details</h6>
        </div>
        <div className="card-body p-4">
          <form action={createUser}>
            <div className="mb-3">
              <label className="form-label" htmlFor="username">Username <span className="text-danger">*</span></label>
              <input id="username" name="username" required className="form-control" autoComplete="off" />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password <span className="text-danger">*</span></label>
              <input id="password" name="password" type="password" required className="form-control" autoComplete="new-password" />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="role">Role <span className="text-danger">*</span></label>
              <select id="role" name="role" className="form-select">
                <option value="user">User (Bus Group Leader)</option>
                <option value="reporter">Reporter (Read-only)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {busList.length > 0 && (
              <div className="mb-4">
                <label className="form-label">Assign Buses <span className="text-muted fw-normal">(for User role)</span></label>
                <div className="card border bg-light" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <div className="card-body py-2 px-3">
                    {busesByEvent.map(({ event, buses }) => (
                      <div key={event.id} className="mb-2">
                        <div className="text-muted fw-semibold" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{event.name}</div>
                        {buses.map((b) => (
                          <label key={b.id} className="d-flex align-items-center gap-2 py-1" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input type="checkbox" name="busIds" value={b.id} className="form-check-input mt-0" />
                            #{b.busNumber} – {b.busName}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="d-grid gap-2 d-sm-flex">
              <button type="submit" className="btn btn-primary flex-sm-fill">Create User</button>
              <Link href="/admin/users" className="btn btn-outline-secondary flex-sm-fill text-center">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
