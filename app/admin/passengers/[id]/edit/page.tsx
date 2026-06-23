import { db } from '@/lib/db'
import { buses, passengers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { updatePassenger } from '@/lib/actions/passengers'

export default async function EditPassengerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [passenger] = await db.select().from(passengers).where(eq(passengers.id, id)).limit(1)
  if (!passenger) notFound()

  const busList = await db.select().from(buses).where(eq(buses.eventId, passenger.eventId)).orderBy(buses.busNumber)
  const update = updatePassenger.bind(null, id)

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-6">Edit Passenger</h2>
      <div className="glass-card p-6">
        <form action={update} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Ref ID *</label>
            <input name="refId" required defaultValue={passenger.refId} className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Full Name *</label>
            <input name="name" required defaultValue={passenger.name} className="glass-input w-full px-4 py-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Gender</label>
              <select name="gender" defaultValue={passenger.gender ?? ''} className="glass-input w-full px-4 py-3 text-sm">
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Age</label>
              <input name="age" type="number" min="0" max="120" defaultValue={passenger.age ?? ''} className="glass-input w-full px-4 py-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Assign to Bus</label>
            <select name="assignedBusId" defaultValue={passenger.assignedBusId ?? ''} className="glass-input w-full px-4 py-3 text-sm">
              <option value="">No assignment</option>
              {busList.map((b) => (
                <option key={b.id} value={b.id}>#{b.busNumber} – {b.busName}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Save</button>
            <a href={`/admin/passengers?eventId=${passenger.eventId}`} className="btn-ghost px-6 py-2 text-sm">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  )
}
