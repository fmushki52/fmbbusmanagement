import { db } from '@/lib/db'
import { buses, events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ImportForm } from './ImportForm'

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  if (!eventId) return notFound()

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return notFound()

  const busList = await db.select().from(buses).where(eq(buses.eventId, eventId)).orderBy(buses.busNumber)

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-1">Import Passengers</h2>
      <p className="text-sm text-gray-500 mb-6">{event.name}</p>
      <ImportForm eventId={eventId} buses={busList} />
    </div>
  )
}
