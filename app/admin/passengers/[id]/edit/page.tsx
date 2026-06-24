import { db } from '@/lib/db'
import { buses, passengers } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { updatePassenger } from '@/lib/actions/passengers'
import Link from 'next/link'

export default async function EditPassengerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [passenger] = await db.select().from(passengers).where(eq(passengers.id, id)).limit(1)
  if (!passenger) notFound()

  const busList = await db.select().from(buses).where(eq(buses.eventId, passenger.eventId))
    .orderBy(sql`CAST(${buses.busNumber} AS INTEGER)`)
  const update = updatePassenger.bind(null, id)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="py-3 px-3">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/passengers?eventId=${passenger.eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <h2 className="h4 fw-bold mb-0">Edit Passenger</h2>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={update} className="d-flex flex-column gap-3">

            <div>
              <label htmlFor="refId" className="form-label fw-semibold">Ref ID <span className="text-danger">*</span></label>
              <input
                id="refId" name="refId" required defaultValue={passenger.refId}
                className="form-control" inputMode="numeric" pattern="[0-9]*"
                onInput={(e: any) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
              />
            </div>

            <div>
              <label htmlFor="name" className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
              <input id="name" name="name" required defaultValue={passenger.name} className="form-control" />
            </div>

            <div className="row g-3">
              <div className="col-6">
                <label htmlFor="gender" className="form-label fw-semibold">Gender</label>
                <select id="gender" name="gender" defaultValue={passenger.gender ?? ''} className="form-select">
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-6">
                <label htmlFor="age" className="form-label fw-semibold">Age</label>
                <input id="age" name="age" type="number" min="0" max="120"
                  defaultValue={passenger.age ?? ''} className="form-control" />
              </div>
            </div>

            <div>
              <label htmlFor="assignedBusId" className="form-label fw-semibold">Assign to Bus</label>
              <select id="assignedBusId" name="assignedBusId" defaultValue={passenger.assignedBusId ?? ''} className="form-select">
                <option value="">No assignment</option>
                {busList.map((b) => (
                  <option key={b.id} value={b.id}>#{b.busNumber} – {b.busName}</option>
                ))}
              </select>
            </div>

            <div className="d-flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary px-4">Save Changes</button>
              <Link href={`/admin/passengers?eventId=${passenger.eventId}`} className="btn btn-outline-secondary px-4">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
