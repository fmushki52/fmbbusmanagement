import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ImportBusForm } from './ImportBusForm'
import Link from 'next/link'

export default async function ImportBusPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }} className="py-3 px-3">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href={`/admin/buses?eventId=${eventId}`} className="btn btn-sm btn-outline-secondary">← Back</Link>
        <div>
          <h2 className="h4 fw-bold mb-0">Import Buses</h2>
          <small className="text-muted">{event.name}</small>
        </div>
      </div>
      <ImportBusForm eventId={eventId} />
    </div>
  )
}
