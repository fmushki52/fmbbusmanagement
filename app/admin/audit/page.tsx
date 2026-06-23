import { db } from '@/lib/db'
import { auditLog, users } from '@/lib/db/schema'
import { eq, sql, desc } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const actionBadge: Record<string, string> = {
  board: 'bg-success',
  remove: 'bg-danger',
  reassign: 'bg-warning text-dark',
  assign: 'bg-primary',
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
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.performedBy, users.id))
    .orderBy(desc(auditLog.performedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(auditLog)
  const totalPages = Math.ceil(Number(total) / PAGE_SIZE)

  return (
    <>
      <h2 className="h3 fw-bold mb-4">Audit Log</h2>
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0 small">
            <thead className="table-light">
              <tr>
                <th>Action</th>
                <th>Performed By</th>
                <th>Note</th>
                <th className="text-end">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><span className={`badge ${actionBadge[log.action ?? ''] ?? 'bg-secondary'}`}>{log.action}</span></td>
                  <td className="fw-medium">{log.performedByUsername ?? '—'}</td>
                  <td className="text-muted" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.note ?? '—'}</td>
                  <td className="text-end text-muted text-nowrap">{log.performedAt ? new Date(log.performedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No audit entries yet.</td></tr>}
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
