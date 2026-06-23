import { db } from '@/lib/db'
import { users, buses, events, userBuses } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { updateUser } from '@/lib/actions/users'

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
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-6">Edit User: {user.username}</h2>
      <div className="glass-card p-6">
        <form action={update} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Role *</label>
            <select name="role" defaultValue={user.role} className="glass-input w-full px-4 py-3 text-sm">
              <option value="user">User (Bus Group Leader)</option>
              <option value="reporter">Reporter (Read-only)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <select name="isActive" defaultValue={user.isActive ? 'true' : 'false'} className="glass-input w-full px-4 py-3 text-sm">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">New Password (leave blank to keep current)</label>
            <input name="newPassword" type="password" className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          {busList.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Assigned Buses (for user role)</label>
              <div className="glass-card p-3 space-y-2 max-h-48 overflow-y-auto">
                {busesByEvent.map(({ event, buses }) => (
                  <div key={event.id}>
                    <p className="text-xs font-medium text-gray-500 mb-1">{event.name}</p>
                    {buses.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                        <input type="checkbox" name="busIds" value={b.id} defaultChecked={currentBusIds.has(b.id)} />
                        <span className="text-sm">#{b.busNumber} – {b.busName}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Save Changes</button>
            <a href="/admin/users" className="btn-ghost px-6 py-2 text-sm">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  )
}
