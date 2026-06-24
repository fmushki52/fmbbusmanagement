import { db } from '@/lib/db'
import { events, buses, passengers, users, auditLog } from '@/lib/db/schema'
import { count, sql } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [eventCount, busCount, passengerCount, userCount, recentAudit] = await Promise.all([
    db.select({ c: count() }).from(events),
    db.select({ c: count() }).from(buses),
    db.select({ c: count() }).from(passengers),
    db.select({ c: count() }).from(users),
    db.select().from(auditLog).orderBy(sql`${auditLog.performedAt} desc`).limit(8),
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
      <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
        <h1 className="h4 fw-bold mb-0">Dashboard</h1>
        <Link href="/admin/events/new" className="btn btn-primary btn-sm px-3">
          + New Event
        </Link>
      </div>

      {/* Stat cards — 3 on mobile, 5 on desktop */}
      <div className="row g-2 g-md-3 mb-4">
        {stats.map(s => (
          <div className="col" key={s.label} style={{ minWidth: 0 }}>
            <Link href={s.href} className="text-decoration-none">
              <div className={`card border-0 shadow-sm h-100 border-start border-3 border-${s.color}`}>
                <div className="card-body text-center py-3 px-2">
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)' }}>{s.icon}</div>
                  <div className={`fw-bold text-${s.color}`} style={{ fontSize: 'clamp(1.1rem, 5vw, 1.5rem)' }}>{s.value}</div>
                  <div className="text-muted" style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.75rem)' }}>{s.label}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
          <h5 className="mb-0 fw-semibold" style={{ fontSize: '0.95rem' }}>Recent Activity</h5>
          <Link href="/admin/audit" className="btn btn-sm btn-outline-secondary" style={{ fontSize: '0.75rem' }}>View all →</Link>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle" style={{ fontSize: '0.82rem' }}>
            <thead className="table-light">
              <tr>
                <th>Action</th>
                <th className="d-none d-sm-table-cell">Note</th>
                <th className="text-end">When</th>
              </tr>
            </thead>
            <tbody>
              {recentAudit.length === 0 && (
                <tr><td colSpan={3} className="text-center text-muted py-4">No activity yet</td></tr>
              )}
              {recentAudit.map(log => (
                <tr key={log.id}>
                  <td><span className="badge bg-primary-subtle text-primary-emphasis" style={{ fontSize: '0.7rem' }}>{log.action}</span></td>
                  <td className="text-muted d-none d-sm-table-cell" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.note}</td>
                  <td className="text-end text-muted text-nowrap">
                    {log.performedAt ? new Date(log.performedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
