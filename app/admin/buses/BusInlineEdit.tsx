'use client'

import { useState, useTransition } from 'react'
import { bulkUpdateBuses } from '@/lib/actions/buses'
import type { Bus } from '@/lib/db/schema'

interface Row {
  id: string
  busNumber: string
  busName: string
  groupLeaderName: string
  groupLeaderContact: string
  capacity: number
}

interface Props {
  buses: Bus[]
  seatCounts: Record<string, number>
  eventId: string
  isArchived: boolean
}

export function BusInlineEdit({ buses, seatCounts, eventId, isArchived }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [rows, setRows] = useState<Row[]>(buses.map((b) => ({
    id: b.id,
    busNumber: b.busNumber,
    busName: b.busName,
    groupLeaderName: b.groupLeaderName,
    groupLeaderContact: b.groupLeaderContact,
    capacity: b.capacity,
  })))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function update(id: string, field: keyof Row, value: string | number) {
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, [field]: value } : r))
  }

  function handleSave() {
    startTransition(async () => {
      await bulkUpdateBuses(rows.map((r) => ({
        id: r.id,
        busNumber: r.busNumber,
        busName: r.busName,
        groupLeaderName: r.groupLeaderName,
        groupLeaderContact: r.groupLeaderContact,
        capacity: Number(r.capacity),
      })))
      setSaved(true)
      setEditMode(false)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleCancel() {
    setRows(buses.map((b) => ({
      id: b.id, busNumber: b.busNumber, busName: b.busName,
      groupLeaderName: b.groupLeaderName, groupLeaderContact: b.groupLeaderContact, capacity: b.capacity,
    })))
    setEditMode(false)
  }

  if (!editMode) {
    return (
      <div>
        {saved && <div className="alert alert-success py-2 mb-3 small">Changes saved successfully.</div>}
        <div className="d-flex justify-content-end mb-2">
          {!isArchived && (
            <button onClick={() => setEditMode(true)} className="btn btn-outline-primary btn-sm">
              Edit All Buses
            </button>
          )}
        </div>
        {/* Card grid view */}
        <div className="row g-3">
          {buses.map((bus) => {
            const seated = seatCounts[bus.id] ?? 0
            const pct = Math.round((seated / bus.capacity) * 100)
            const isFull = seated >= bus.capacity
            return (
              <div key={bus.id} className="col-12 col-sm-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold fs-5">#{bus.busNumber} <span className="fs-6 fw-normal text-muted">{bus.busName}</span></div>
                        <div className="small text-muted mt-1">👤 {bus.groupLeaderName}</div>
                        <div className="small text-muted">{bus.groupLeaderContact}</div>
                      </div>
                      {!isArchived && (
                        <div className="d-flex gap-1">
                          <a href={`/admin/buses/${bus.id}/edit`} className="btn btn-outline-secondary btn-sm">Edit</a>
                          <DeleteBusBtn busId={bus.id} busNumber={bus.busNumber} />
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>{seated} / {bus.capacity} seated</span>
                        <span className={isFull ? 'text-danger fw-bold' : ''}>{isFull ? 'FULL' : `${bus.capacity - seated} left`}</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className={`progress-bar ${isFull ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {buses.length === 0 && (
          <div className="card border-0 shadow-sm p-5 text-center text-muted">
            <div className="fs-3 mb-2">🚌</div>
            <p>No buses yet. <a href={`/admin/buses/new?eventId=${eventId}`} className="text-primary">Add first bus</a></p>
          </div>
        )}
      </div>
    )
  }

  // Edit mode — inline table
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold small text-muted">Editing {rows.length} buses</span>
        <div className="d-flex gap-2">
          <button onClick={handleCancel} className="btn btn-outline-secondary btn-sm">Cancel</button>
          <button onClick={handleSave} disabled={isPending} className="btn btn-primary btn-sm">
            {isPending ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save All'}
          </button>
        </div>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.82rem' }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Bus Name</th>
                <th>Leader Name</th>
                <th>Contact</th>
                <th style={{ width: 80 }}>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><input value={r.busNumber} onChange={(e) => update(r.id, 'busNumber', e.target.value)} className="form-control form-control-sm" /></td>
                  <td><input value={r.busName} onChange={(e) => update(r.id, 'busName', e.target.value)} className="form-control form-control-sm" /></td>
                  <td><input value={r.groupLeaderName} onChange={(e) => update(r.id, 'groupLeaderName', e.target.value)} className="form-control form-control-sm" /></td>
                  <td><input value={r.groupLeaderContact} onChange={(e) => update(r.id, 'groupLeaderContact', e.target.value)} className="form-control form-control-sm" /></td>
                  <td><input type="number" min="1" value={r.capacity} onChange={(e) => update(r.id, 'capacity', parseInt(e.target.value) || 1)} className="form-control form-control-sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DeleteBusBtn({ busId, busNumber }: { busId: string; busNumber: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      if (!confirm(`Delete Bus #${busNumber}?`)) return
      startTransition(async () => {
        const { deleteBus } = await import('@/lib/actions/buses')
        await deleteBus(busId)
      })
    }}>
      <button type="submit" disabled={isPending} className="btn btn-outline-danger btn-sm">Del</button>
    </form>
  )
}
