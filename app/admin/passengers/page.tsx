import { db } from '@/lib/db'
import { buses, events, passengers } from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import Link from 'next/link'
import { PassengerTable } from './PassengerTable'

export const dynamic = 'force-dynamic'

export default async function PassengersPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; page?: string; q?: string }>
}) {
  const { eventId, page: pageStr, q } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const PAGE_SIZE = 50

  const eventList = await db.select().from(events).orderBy(sql`${events.name}`)
  const selectedEvent = eventId ? eventList.find((e) => e.id === eventId) : eventList[0]

  let passengerList: typeof passengers.$inferSelect[] = []
  let total = 0
  let busList: typeof buses.$inferSelect[] = []

  if (selectedEvent) {
    busList = await db.select().from(buses).where(eq(buses.eventId, selectedEvent.id))
      .orderBy(sql`CAST(${buses.busNumber} AS INTEGER)`)

    const conditions = [eq(passengers.eventId, selectedEvent.id)]
    if (q) {
      conditions.push(sql`(lower(${passengers.name}) like ${'%' + q.toLowerCase() + '%'} OR lower(${passengers.refId}) like ${'%' + q.toLowerCase() + '%'})`)
    }
    const whereClause = and(...conditions)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(passengers)
      .where(whereClause)
    total = Number(count)

    passengerList = await db
      .select()
      .from(passengers)
      .where(whereClause)
      .orderBy(passengers.name)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="pb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h2 className="h4 fw-bold mb-0">Passengers</h2>
        <div className="d-flex gap-2">
          {selectedEvent && selectedEvent.status === 'active' && (
            <>
              <Link href={`/admin/passengers/new?eventId=${selectedEvent.id}`} className="btn btn-primary btn-sm">
                + Add
              </Link>
              <Link href={`/admin/passengers/import?eventId=${selectedEvent.id}`} className="btn btn-outline-secondary btn-sm">
                Import CSV/Excel
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Event picker */}
      <div className="d-flex gap-2 overflow-auto mb-3 pb-1">
        {eventList.map((e) => (
          <Link
            key={e.id}
            href={`/admin/passengers?eventId=${e.id}`}
            className={`btn btn-sm flex-shrink-0 ${selectedEvent?.id === e.id ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            {e.name}
          </Link>
        ))}
      </div>

      {selectedEvent && (
        <>
          <form method="get" className="d-flex gap-2 mb-3">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search by name or ref ID…"
              className="form-control form-control-sm"
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {q && <Link href={`/admin/passengers?eventId=${selectedEvent.id}`} className="btn btn-outline-secondary btn-sm">Clear</Link>}
          </form>

          <PassengerTable
            passengers={passengerList}
            buses={busList}
            event={selectedEvent}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            eventId={selectedEvent.id}
          />
        </>
      )}
    </div>
  )
}
