import { db } from '@/lib/db'
import { auditLog, users, passengers, buses, events } from '@/lib/db/schema'
import { eq, sql, desc } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const actionBadge: Record<string, string> = {
  board: 'bg-success',
  remove: 'bg-danger',
  reassign: 'bg-warning text-dark',
  assign: 'bg-primary',
}

const actionLabel: Record<string, string> = {
  board: 'Boarded',
  remove: 'Removed',
  reassign: 'Reassigned',
  assign: 'Assigned',
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const PAGE_SIZE = 50

  const logs = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      note: auditLog.note,
      performedAt: auditLog.performedAt,
      performedByUsername: users.username,
      passengerName: passengers.name,
      passengerRefId: passengers.refId,
      busNumber: buses.busNumber,
      busName: buses.busName,
      eventName: events.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.performedBy, users.id))
    .leftJoin(passengers, eq(auditLog.passengerId, passengers.id))
    .leftJoin(buses, eq(auditLog.busId, buses.id))
    .leftJoin(events, eq(auditLog.eventId, events.id))
    .orderBy(desc(auditLog.performedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(auditLog)
  const totalPages = Math.ceil(Number(total) / PAGE_SIZE)

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="h4 fw-bold mb-0">Audit Log</h2>
        <span className="text-muted small">{Number(total)} entries</span>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0" style={{ fontSize: '0.82rem' }}>
            <thead className="table-light">
              <tr>
                <th className="ps-3">When</th>
                <th>Action</th>
                <th>By</th>
                <th>Passenger</th>
                <th>Bus</th>
                <th>Event</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="ps-3 text-muted text-nowrap">
                    {log.performedAt ? new Date(log.performedAt).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    }) : '—'}
                    <br />
                    <span style={{ fontSize: '0.75rem' }}>
                      {log.performedAt ? new Date(log.performedAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      }) : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${actionBadge[log.action ?? ''] ?? 'bg-secondary'}`}>
                      {actionLabel[log.action ?? ''] ?? log.action}
                    </span>
                  </td>
                  <td className="fw-semibold">{log.performedByUsername ?? '—'}</td>
                  <td>
                    {log.passengerName ? (
                      <div>
                        <div className="fw-medium">{log.passengerName}</div>
                        <div className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>ID: {log.passengerRefId}</div>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {log.busNumber ? (
                      <div>
                        <div className="fw-medium">Bus #{log.busNumber}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{log.busName}</div>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.eventName ?? '—'}
                  </td>
                  <td className="text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.note ?? '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted py-4">No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between mt-3 small">
          <span className="text-muted">{Number(total)} total entries</span>
          <div className="d-flex gap-2 align-items-center">
            {page > 1 && <Link href={`/admin/audit?page=${page - 1}`} className="btn btn-sm btn-outline-secondary">← Prev</Link>}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages && <Link href={`/admin/audit?page=${page + 1}`} className="btn btn-sm btn-outline-secondary">Next →</Link>}
          </div>
        </div>
      )}
    </>
  )
}
