import { db } from '@/lib/db'
import { events, buses, passengers, users, auditLog } from '@/lib/db/schema'
import { count, eq, sql } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [eventCount, busCount, passengerCount, userCount, recentAudit] = await Promise.all([
    db.select({ c: count() }).from(events),
    db.select({ c: count() }).from(buses),
    db.select({ c: count() }).from(passengers),
    db.select({ c: count() }).from(users),
    db.select().from(auditLog).orderBy(sql`${auditLog.performedAt} desc`).limit(10),
  ])
  const seatedCount = await db.select({ c: count() }).from(passengers).where(sql`${passengers.seatedBusId} is not null`)

  const stats = [
    { label: 'Events', value: eventCount[0].c, icon: '📅', href: '/admin/events', color: 'primary' },
    { label: 'Buses', value: busCount[0].c, icon: '🚌', href: '/admin/buses', color: 'success' },
    { label: 'Passengers', value: passengerCount[0].c, icon: '👥', href: '/admin/passengers', color: 'info' },
    { label: 'Seated', value: seatedCount[0].c, icon: '✅', href: '/admin/passengers', color: 'warning' },
    { label: 'Users', value: userCount[0].c, icon: '👤', href: '/admin/users', color: 'secondary' },
  ]

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 fw-bold mb-0">Dashboard</h1>
        <Link href="/admin/events/new" className="btn btn-primary">+ New Event</Link>
      </div>

      <div className="row g-3 mb-4">
        {stats.map(s => (
          <div className="col-6 col-md-4 col-lg-2-4" key={s.label} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
            <Link href={s.href} className="text-decoration-none">
              <div className={`card border-0 shadow-sm h-100 border-start border-4 border-${s.color}`}>
                <div className="card-body text-center py-3">
                  <div className="fs-3 mb-1">{s.icon}</div>
                  <div className={`fs-4 fw-bold text-${s.color}`}>{s.value}</div>
                  <div className="small text-muted">{s.label}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <h5 className="mb-0">Recent Activity</h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Action</th>
                <th>Note</th>
                <th className="text-end">When</th>
              </tr>
            </thead>
            <tbody>
              {recentAudit.length === 0 && (
                <tr><td colSpan={3} className="text-center text-muted py-4">No activity yet</td></tr>
              )}
              {recentAudit.map(log => (
                <tr key={log.id}>
                  <td><span className="badge bg-primary-subtle text-primary-emphasis">{log.action}</span></td>
                  <td className="text-muted small">{log.note}</td>
                  <td className="text-end text-muted small">
                    {log.performedAt ? new Date(log.performedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-white text-end">
          <Link href="/admin/audit" className="btn btn-sm btn-outline-secondary">View all →</Link>
        </div>
      </div>
    </>
  )
}
