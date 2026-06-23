import { db } from '@/lib/db'
import { buses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { updateBus } from '@/lib/actions/buses'

export default async function EditBusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [bus] = await db.select().from(buses).where(eq(buses.id, id)).limit(1)
  if (!bus) notFound()

  const update = updateBus.bind(null, id)

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-6">Edit Bus #{bus.busNumber}</h2>
      <div className="glass-card p-6">
        <form action={update} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bus Number *</label>
              <input name="busNumber" required defaultValue={bus.busNumber} className="glass-input w-full px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bus Name *</label>
              <input name="busName" required defaultValue={bus.busName} className="glass-input w-full px-4 py-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Group Leader Name *</label>
            <input name="groupLeaderName" required defaultValue={bus.groupLeaderName} className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Group Leader Contact *</label>
            <input name="groupLeaderContact" required defaultValue={bus.groupLeaderContact} className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Capacity *</label>
            <input name="capacity" type="number" min="1" required defaultValue={bus.capacity} className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Save</button>
            <a href={`/admin/buses?eventId=${bus.eventId}`} className="btn-ghost px-6 py-2 text-sm">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  )
}
