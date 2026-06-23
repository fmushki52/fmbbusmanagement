import { db } from '@/lib/db'
import { buses, events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { createPassenger } from '@/lib/actions/passengers'

export default async function NewPassengerPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  const busList = await db.select().from(buses).where(eq(buses.eventId, eventId)).orderBy(buses.busNumber)

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-1">Add Passenger</h2>
      <p className="text-sm text-gray-500 mb-6">{event.name}</p>
      <div className="glass-card p-6">
        <form action={createPassenger} className="flex flex-col gap-4">
          <input type="hidden" name="eventId" value={eventId} />
          <div>
            <label className="text-sm font-medium mb-1 block">Ref ID *</label>
            <input name="refId" required className="glass-input w-full px-4 py-3 text-sm" placeholder="Member/ID number" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Full Name *</label>
            <input name="name" required className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Gender</label>
              <select name="gender" className="glass-input w-full px-4 py-3 text-sm">
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Age</label>
              <input name="age" type="number" min="0" max="120" className="glass-input w-full px-4 py-3 text-sm" />
            </div>
          </div>
          {busList.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Assign to Bus</label>
              <select name="assignedBusId" className="glass-input w-full px-4 py-3 text-sm">
                <option value="">No assignment</option>
                {busList.map((b) => (
                  <option key={b.id} value={b.id}>#{b.busNumber} – {b.busName}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Add Passenger</button>
            <a href={`/admin/passengers?eventId=${eventId}`} className="btn-ghost px-6 py-2 text-sm">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  )
}
