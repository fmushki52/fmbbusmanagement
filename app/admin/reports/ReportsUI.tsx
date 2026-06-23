'use client'
import { useState } from 'react'
import type { Event, Bus } from '@/lib/db/schema'

interface Props {
  events: Event[]
  buses: Bus[]
  seatCounts: Record<string, number>
}

export function ReportsUI({ events, buses, seatCounts }: Props) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '')
  const eventBuses = buses.filter((b) => b.eventId === selectedEventId)

  function download(type: 'event' | 'bus', id: string, format: 'pdf' | 'excel') {
    window.open(`/api/reports/${format}?type=${type}&id=${id}`, '_blank')
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <label className="form-label fw-medium">Select Event</label>
          <select className="form-select" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.status})</option>)}
          </select>
        </div>
      </div>

      {selectedEventId && (
        <>
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Event Summary Report</h5>
              <p className="text-muted small mb-3">All buses with capacity, seated, remaining and unseated passengers</p>
              <div className="d-flex gap-2">
                <button onClick={() => download('event', selectedEventId, 'pdf')} className="btn btn-primary btn-sm">↓ PDF</button>
                <button onClick={() => download('event', selectedEventId, 'excel')} className="btn btn-outline-secondary btn-sm">↓ Excel</button>
              </div>
            </div>
          </div>

          {eventBuses.length > 0 && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white"><h5 className="mb-0">Per-Bus Reports</h5></div>
              <div className="list-group list-group-flush">
                {eventBuses.map((bus) => {
                  const seated = seatCounts[bus.id] ?? 0
                  return (
                    <div key={bus.id} className="list-group-item d-flex align-items-center gap-3 flex-wrap">
                      <div className="flex-grow-1">
                        <p className="fw-medium mb-0">Bus #{bus.busNumber} – {bus.busName}</p>
                        <p className="small text-muted mb-0">{seated} / {bus.capacity} seated</p>
                      </div>
                      <div className="d-flex gap-2">
                        <button onClick={() => download('bus', bus.id, 'pdf')} className="btn btn-primary btn-sm">↓ PDF</button>
                        <button onClick={() => download('bus', bus.id, 'excel')} className="btn btn-outline-secondary btn-sm">↓ Excel</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
