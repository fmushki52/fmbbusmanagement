import { db } from '@/lib/db'
import { buses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { updateBus } from '@/lib/actions/buses'
import Link from 'next/link'

export default async function EditBusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [bus] = await db.select().from(buses).where(eq(buses.id, id)).limit(1)
  if (!bus) notFound()

  const update = updateBus.bind(null, id)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="py-3 px-3">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/buses?eventId=${bus.eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <h2 className="h4 fw-bold mb-0">Edit Bus #{bus.busNumber}</h2>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={update} className="d-flex flex-column gap-3">
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label fw-semibold">Bus Number <span className="text-danger">*</span></label>
                <input name="busNumber" required defaultValue={bus.busNumber} className="form-control" inputMode="numeric" />
              </div>
              <div className="col-6">
                <label className="form-label fw-semibold">Bus Name <span className="text-danger">*</span></label>
                <input name="busName" required defaultValue={bus.busName} className="form-control" />
              </div>
            </div>
            <div>
              <label className="form-label fw-semibold">Group Leader Name <span className="text-danger">*</span></label>
              <input name="groupLeaderName" required defaultValue={bus.groupLeaderName} className="form-control" />
            </div>
            <div>
              <label className="form-label fw-semibold">Group Leader Contact <span className="text-danger">*</span></label>
              <input name="groupLeaderContact" required defaultValue={bus.groupLeaderContact} className="form-control" />
            </div>
            <div>
              <label className="form-label fw-semibold">Capacity <span className="text-danger">*</span></label>
              <input name="capacity" type="number" min="1" required defaultValue={bus.capacity} className="form-control" />
            </div>
            <div className="d-flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary px-4">Save Changes</button>
              <Link href={`/admin/buses?eventId=${bus.eventId}`} className="btn btn-outline-secondary px-4">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
