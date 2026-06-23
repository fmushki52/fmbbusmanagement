import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createBus } from '@/lib/actions/buses'
import { notFound } from 'next/navigation'

export default async function NewBusPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-1">Add Bus</h2>
      <p className="text-sm text-gray-500 mb-6">{event.name}</p>
      <div className="glass-card p-6">
        <form action={createBus} className="flex flex-col gap-4">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bus Number *</label>
              <input name="busNumber" required className="glass-input w-full px-4 py-3 text-sm" placeholder="1" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bus Name *</label>
              <input name="busName" required className="glass-input w-full px-4 py-3 text-sm" placeholder="Alpha" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Group Leader Name *</label>
            <input name="groupLeaderName" required className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Group Leader Contact *</label>
            <input name="groupLeaderContact" required className="glass-input w-full px-4 py-3 text-sm" placeholder="+1 555-0100" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Capacity *</label>
            <input name="capacity" type="number" min="1" required className="glass-input w-full px-4 py-3 text-sm" placeholder="45" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Add Bus</button>
            <a href={`/admin/buses?eventId=${eventId}`} className="btn-ghost px-6 py-2 text-sm">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  )
}
