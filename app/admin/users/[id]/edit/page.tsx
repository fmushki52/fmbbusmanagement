import { db } from '@/lib/db'
import { users, buses, events, userBuses } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { updateUser } from '@/lib/actions/users'
import Link from 'next/link'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) notFound()

  const currentBuses = await db.select({ busId: userBuses.busId }).from(userBuses).where(eq(userBuses.userId, id))
  const currentBusIds = new Set(currentBuses.map((b) => b.busId))

  const eventList = await db.select().from(events).where(eq(events.status, 'active')).orderBy(sql`${events.name}`)
  const busList = await db.select().from(buses).orderBy(buses.busNumber)
  const busesByEvent = eventList.map((e) => ({
    event: e,
    buses: busList.filter((b) => b.eventId === e.id),
  }))

  const update = updateUser.bind(null, id)

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href="/admin/users" className="btn btn-sm btn-outline-secondary">← Back</Link>
        <h2 className="h4 fw-bold mb-0">Edit: {user.username}</h2>
      </div>
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">🔐 User Settings</h6>
        </div>
        <div className="card-body p-4">
          <form action={update}>
            <div className="mb-3">
              <label className="form-label" htmlFor="role">Role <span className="text-danger">*</span></label>
              <select id="role" name="role" defaultValue={user.role} className="form-select">
                <option value="user">User (Bus Group Leader)</option>
                <option value="reporter">Reporter (Read-only)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="isActive">Status</label>
              <select id="isActive" name="isActive" defaultValue={user.isActive ? 'true' : 'false'} className="form-select">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="newPassword">New Password <span className="text-muted fw-normal">(leave blank to keep)</span></label>
              <input id="newPassword" name="newPassword" type="password" className="form-control" autoComplete="new-password" />
            </div>
            {busList.length > 0 && (
              <div className="mb-4">
                <label className="form-label">Assigned Buses <span className="text-muted fw-normal">(User role)</span></label>
                <div className="card border bg-light" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <div className="card-body py-2 px-3">
                    {busesByEvent.map(({ event, buses }) => (
                      <div key={event.id} className="mb-2">
                        <div className="text-muted fw-semibold" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{event.name}</div>
                        {buses.map((b) => (
                          <label key={b.id} className="d-flex align-items-center gap-2 py-1" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input type="checkbox" name="busIds" value={b.id} defaultChecked={currentBusIds.has(b.id)} className="form-check-input mt-0" />
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
              <button type="submit" className="btn btn-primary flex-sm-fill">Save Changes</button>
              <Link href="/admin/users" className="btn btn-outline-secondary flex-sm-fill text-center">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
