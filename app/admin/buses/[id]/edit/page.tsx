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
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/buses?eventId=${bus.eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <h2 className="h4 fw-bold mb-0">Edit Bus #{bus.busNumber}</h2>
      </div>
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">🚌 Bus Details</h6>
        </div>
        <div className="card-body p-4">
          <form action={update}>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label" htmlFor="busNumber">Bus # <span className="text-danger">*</span></label>
                <input id="busNumber" name="busNumber" required defaultValue={bus.busNumber} className="form-control" />
              </div>
              <div className="col-6">
                <label className="form-label" htmlFor="busName">Bus Name <span className="text-danger">*</span></label>
                <input id="busName" name="busName" required defaultValue={bus.busName} className="form-control" />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="groupLeaderName">Leader Name <span className="text-danger">*</span></label>
              <input id="groupLeaderName" name="groupLeaderName" required defaultValue={bus.groupLeaderName} className="form-control" />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="groupLeaderContact">Leader Contact <span className="text-danger">*</span></label>
              <input id="groupLeaderContact" name="groupLeaderContact" required defaultValue={bus.groupLeaderContact} className="form-control" />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="capacity">Capacity <span className="text-danger">*</span></label>
              <input id="capacity" name="capacity" type="number" min="1" required defaultValue={bus.capacity} className="form-control" />
            </div>
            <div className="d-grid gap-2 d-sm-flex">
              <button type="submit" className="btn btn-primary flex-sm-fill">Save Changes</button>
              <Link href={`/admin/buses?eventId=${bus.eventId}`} className="btn btn-outline-secondary flex-sm-fill text-center">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
