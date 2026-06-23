import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { userBuses, buses, events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { NavBar } from '@/components/ui/NavBar'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let mappedBuses: Array<{
    busId: string; busNumber: string; busName: string
    groupLeaderName: string; eventId: string; eventName: string; eventStatus: string
  }> = []

  if (session.role === 'admin') {
    const busList = await db.select({
      busId: buses.id, busNumber: buses.busNumber, busName: buses.busName,
      groupLeaderName: buses.groupLeaderName, eventId: events.id, eventName: events.name, eventStatus: events.status,
    }).from(buses).innerJoin(events, eq(buses.eventId, events.id))
    mappedBuses = busList
  } else {
    const mappings = await db
      .select({
        busId: userBuses.busId, busNumber: buses.busNumber, busName: buses.busName,
        groupLeaderName: buses.groupLeaderName, eventId: events.id, eventName: events.name, eventStatus: events.status,
      })
      .from(userBuses)
      .innerJoin(buses, eq(userBuses.busId, buses.id))
      .innerJoin(events, eq(buses.eventId, events.id))
      .where(eq(userBuses.userId, session.userId))
    mappedBuses = mappings
  }

  if (mappedBuses.length === 1) redirect(`/app/${mappedBuses[0].busId}`)

  const byEvent = mappedBuses.reduce((acc, b) => {
    if (!acc[b.eventId]) acc[b.eventId] = { eventName: b.eventName, eventStatus: b.eventStatus, buses: [] }
    acc[b.eventId].buses.push(b)
    return acc
  }, {} as Record<string, { eventName: string; eventStatus: string; buses: typeof mappedBuses }>)

  return (
    <>
      <NavBar role={session.role} username={session.username} />
      <div className="container py-4" style={{ maxWidth: 540 }}>
        <h2 className="h4 fw-bold mb-4">Select Your Bus</h2>
        {Object.entries(byEvent).map(([eventId, { eventName, eventStatus, buses: busList }]) => (
          <div key={eventId} className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <h5 className="fw-semibold mb-0">{eventName}</h5>
              {eventStatus === 'archived' && <span className="badge bg-secondary">archived</span>}
            </div>
            <div className="d-flex flex-column gap-2">
              {busList.map((bus) => (
                <Link key={bus.busId} href={`/app/${bus.busId}`} className="card border-0 shadow-sm text-decoration-none">
                  <div className="card-body d-flex align-items-center gap-3">
                    <div className="rounded-3 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center fw-bold text-primary"
                      style={{ width: 48, height: 48, fontSize: 18 }}>
                      {bus.busNumber}
                    </div>
                    <div className="flex-grow-1">
                      <p className="fw-semibold mb-0">{bus.busName}</p>
                      <p className="small text-muted mb-0">{bus.groupLeaderName}</p>
                    </div>
                    <span className="text-muted">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {mappedBuses.length === 0 && (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5 text-muted">
              <div className="fs-1 mb-2">🚌</div>
              <p className="mb-0">No buses assigned to your account.</p>
              <p className="small">Contact your administrator.</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
