'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deletePassenger, adminRemovePassenger, bulkDeletePassengers, bulkAssignPassengers } from '@/lib/actions/passengers'
import type { Bus, Event, Passenger } from '@/lib/db/schema'

interface Props {
  passengers: Passenger[]
  buses: Bus[]
  event: Event
  total: number
  page: number
  pageSize: number
  totalPages: number
  eventId: string
}

export function PassengerTable({ passengers, buses, event, total, page, totalPages, eventId }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const isArchived = event.status === 'archived'
  const busMap = Object.fromEntries(buses.map((b) => [b.id, b]))

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) setSelected(new Set(passengers.map((p) => p.id)))
    else setSelected(new Set())
  }

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} passengers?`)) return
    startTransition(async () => { await bulkDeletePassengers(Array.from(selected)); setSelected(new Set()) })
  }

  function handleBulkAssign(busId: string | null) {
    startTransition(async () => { await bulkAssignPassengers(Array.from(selected), busId); setSelected(new Set()) })
  }

  return (
    <div>
      {selected.size > 0 && !isArchived && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body p-2 d-flex align-items-center gap-2 flex-wrap">
            <span className="small fw-semibold">{selected.size} selected</span>
            <select
              onChange={(e) => handleBulkAssign(e.target.value || null)}
              className="form-select form-select-sm" style={{ width: 'auto' }}
              defaultValue=""
            >
              <option value="">Assign to bus…</option>
              <option value="">Unassign</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>Bus #{b.busNumber} – {b.busName}</option>
              ))}
            </select>
            <button onClick={handleBulkDelete} disabled={isPending} className="btn btn-danger btn-sm">
              Delete selected
            </button>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.83rem' }}>
            <thead className="table-light">
              <tr>
                {!isArchived && (
                  <th className="ps-3" style={{ width: 36 }}>
                    <input type="checkbox" className="form-check-input" onChange={toggleAll}
                      checked={selected.size === passengers.length && passengers.length > 0} />
                  </th>
                )}
                <th className="ps-3">Ref ID</th>
                <th>Name</th>
                <th className="d-none d-sm-table-cell">Gender</th>
                <th className="d-none d-sm-table-cell">Age</th>
                <th>Assigned</th>
                <th>Seated</th>
                {!isArchived && <th style={{ width: 100 }} />}
              </tr>
            </thead>
            <tbody>
              {passengers.map((p) => {
                const assignedBus = p.assignedBusId ? busMap[p.assignedBusId] : null
                const seatedBus = p.seatedBusId ? busMap[p.seatedBusId] : null
                return (
                  <tr key={p.id}>
                    {!isArchived && (
                      <td className="ps-3">
                        <input type="checkbox" className="form-check-input"
                          checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                      </td>
                    )}
                    <td className="ps-3 font-monospace" style={{ fontSize: '0.78rem' }}>{p.refId}</td>
                    <td className="fw-medium">{p.name}</td>
                    <td className="d-none d-sm-table-cell text-muted">{p.gender ?? '—'}</td>
                    <td className="d-none d-sm-table-cell text-muted">{p.age ?? '—'}</td>
                    <td>
                      {assignedBus
                        ? <span className="badge bg-primary-subtle text-primary-emphasis">#{assignedBus.busNumber}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {seatedBus
                        ? <span className="badge bg-success-subtle text-success-emphasis">✓ #{seatedBus.busNumber}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    {!isArchived && (
                      <td>
                        <div className="d-flex gap-2">
                          <Link href={`/admin/passengers/${p.id}/edit`} className="text-primary" style={{ fontSize: '0.78rem' }}>Edit</Link>
                          {p.seatedBusId && (
                            <button onClick={() => startTransition(() => adminRemovePassenger(p.id))}
                              className="btn btn-link btn-sm p-0 text-warning" style={{ fontSize: '0.78rem' }}>
                              Unseat
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm('Delete this passenger?')) startTransition(() => deletePassenger(p.id)) }}
                            className="btn btn-link btn-sm p-0 text-danger" style={{ fontSize: '0.78rem' }}>
                            Del
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {passengers.length === 0 && (
          <div className="text-center text-muted py-5">No passengers found.</div>
        )}
      </div>

      <div className="d-flex align-items-center justify-content-between mt-3 small text-muted">
        <span>{total} total</span>
        {totalPages > 1 && (
          <div className="d-flex gap-2">
            {page > 1 && (
              <Link href={`/admin/passengers?eventId=${eventId}&page=${page - 1}`} className="btn btn-outline-secondary btn-sm">← Prev</Link>
            )}
            <span className="d-flex align-items-center px-2">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={`/admin/passengers?eventId=${eventId}&page=${page + 1}`} className="btn btn-outline-secondary btn-sm">Next →</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
