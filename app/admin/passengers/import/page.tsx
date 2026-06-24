import { db } from '@/lib/db'
import { buses, events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ImportForm } from './ImportForm'
import Link from 'next/link'

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  const busList = await db.select().from(buses).where(eq(buses.eventId, eventId)).orderBy(buses.busNumber)

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/passengers?eventId=${eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <div>
          <h2 className="h4 fw-bold mb-0">Import Passengers</h2>
          <small className="text-muted">{event.name}</small>
        </div>
      </div>
      <ImportForm eventId={eventId} buses={busList} />
    </>
  )
}
