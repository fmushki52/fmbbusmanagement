import { db } from '@/lib/db'
import { buses, events } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { createUser } from '@/lib/actions/users'

export default async function NewUserPage() {
  const eventList = await db.select().from(events).where(eq(events.status, 'active')).orderBy(sql`${events.name}`)
  const busList = await db.select().from(buses).orderBy(buses.busNumber)

  // Group buses by event
  const busesByEvent = eventList.map((e) => ({
    event: e,
    buses: busList.filter((b) => b.eventId === e.id),
  }))

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-6">New User</h2>
      <div className="glass-card p-6">
        <form action={createUser} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Username *</label>
            <input name="username" required className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Password *</label>
            <input name="password" type="password" required className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Role *</label>
            <select name="role" className="glass-input w-full px-4 py-3 text-sm">
              <option value="user">User (Bus Group Leader)</option>
              <option value="reporter">Reporter (Read-only)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {busList.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Assign Buses (for user role)</label>
              <div className="glass-card p-3 space-y-2 max-h-48 overflow-y-auto">
                {busesByEvent.map(({ event, buses }) => (
                  <div key={event.id}>
                    <p className="text-xs font-medium text-gray-500 mb-1">{event.name}</p>
                    {buses.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                        <input type="checkbox" name="busIds" value={b.id} />
                        <span className="text-sm">#{b.busNumber} – {b.busName}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Create User</button>
            <a href="/admin/users" className="btn-ghost px-6 py-2 text-sm">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  )
}
