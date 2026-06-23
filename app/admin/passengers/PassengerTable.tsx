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
          <div className="card-body py-2 d-flex align-items-center gap-3 flex-wrap">
            <span className="fw-medium small">{selected.size} selected</span>
            <select
              onChange={(e) => handleBulkAssign(e.target.value || null)}
              className="form-select form-select-sm w-auto"
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
          <table className="table table-hover mb-0 small">
            <thead className="table-light">
              <tr>
                {!isArchived && (
                  <th className="ps-3" style={{ width: 40 }}>
                    <input type="checkbox" className="form-check-input" onChange={toggleAll}
                      checked={selected.size === passengers.length && passengers.length > 0} />
                  </th>
                )}
                <th>Ref ID</th>
                <th>Name</th>
                <th className="d-none d-md-table-cell">Gender</th>
                <th className="d-none d-md-table-cell">Age</th>
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
                        <input type="checkbox" className="form-check-input" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                      </td>
                    )}
                    <td className="font-monospace">{p.refId}</td>
                    <td className="fw-medium">{p.name}</td>
                    <td className="d-none d-md-table-cell text-muted">{p.gender ?? '—'}</td>
                    <td className="d-none d-md-table-cell text-muted">{p.age ?? '—'}</td>
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
                          <Link href={`/admin/passengers/${p.id}/edit`} className="link-primary">Edit</Link>
                          {p.seatedBusId && (
                            <button onClick={() => startTransition(() => adminRemovePassenger(p.id))}
                              className="btn btn-link btn-sm p-0 text-warning">Unseat</button>
                          )}
                          <button
                            onClick={() => { if (confirm('Delete this passenger?')) startTransition(() => deletePassenger(p.id)) }}
                            className="btn btn-link btn-sm p-0 text-danger">Del</button>
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
          <div className="p-4 text-center text-muted">No passengers found.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between mt-3 small">
          <span className="text-muted">{total} total</span>
          <div className="d-flex gap-2 align-items-center">
            {page > 1 && <Link href={`/admin/passengers?eventId=${eventId}&page=${page - 1}`} className="btn btn-sm btn-outline-secondary">← Prev</Link>}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages && <Link href={`/admin/passengers?eventId=${eventId}&page=${page + 1}`} className="btn btn-sm btn-outline-secondary">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
