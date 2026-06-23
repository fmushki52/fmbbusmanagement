import { db } from '@/lib/db'
import { events, buses, passengers } from '@/lib/db/schema'
import { count, sql } from 'drizzle-orm'
import { ReportsUI } from '../admin/reports/ReportsUI'

export const dynamic = 'force-dynamic'

export default async function ReporterPage() {
  const eventList = await db.select().from(events).orderBy(sql`${events.createdAt} desc`)
  const busList = await db.select().from(buses)
  const seatCountsRaw = await db
    .select({ busId: passengers.seatedBusId, seated: count() })
    .from(passengers)
    .where(sql`${passengers.seatedBusId} is not null`)
    .groupBy(passengers.seatedBusId)
  const seatCounts = Object.fromEntries(seatCountsRaw.map((r) => [r.busId!, r.seated]))

  return (
    <>
      <h2 className="h3 fw-bold mb-2">Reports</h2>
      <p className="text-muted small mb-4">Export event summaries and per-bus passenger lists.</p>
      <ReportsUI events={eventList} buses={busList} seatCounts={seatCounts} />
    </>
  )
}
