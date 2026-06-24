'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CapacityRing } from '@/components/ui/CapacityRing'
import { showToast } from '@/components/ui/Toast'
import type { Bus, Event, Passenger } from '@/lib/db/schema'
import type { SessionPayload } from '@/lib/auth/session'

interface SeatedPassenger {
  id: string
  name: string
  refId: string
  gender: string | null
  age: number | null
  seatedAt: Date | null
  seatedByUsername: string | null
}

interface Props {
  bus: Bus
  event: Event
  seated: number
  assignedPassengers: Passenger[]
  seatedPassengers: SeatedPassenger[]
  hasAnyAssignments: boolean
  session: SessionPayload
}

interface LookupResult {
  found: boolean
  passenger?: {
    id: string
    name: string
    gender: string | null
    age: number | null
    seatedBusId: string | null
    seatedBusInfo: { busNumber: string; busName: string } | null
    assignedBusId: string | null
    assignedBusInfo: { busNumber: string; busName: string } | null
  }
}

export function BoardingScreen({
  bus, event, seated: initialSeated, assignedPassengers,
  seatedPassengers: initialSeatedList, hasAnyAssignments, session,
}: Props) {
  const [tab, setTab] = useState<'confirm' | 'roster' | 'seated'>('confirm')
  const [refId, setRefId] = useState('')
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [seated, setSeated] = useState(initialSeated)
  const [seatedList, setSeatedList] = useState(initialSeatedList)
  const [confirming, setConfirming] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isArchived = event.status === 'archived'
  const isFull = seated >= bus.capacity

  useEffect(() => {
    if (!hasAnyAssignments && !isArchived) inputRef.current?.focus()
  }, [hasAnyAssignments, isArchived])

  const doLookup = useCallback(async (val: string) => {
    if (!val.trim()) { setLookup(null); return }
    setLookupLoading(true)
    try {
      const res = await fetch(
        `/api/boarding/lookup?refId=${encodeURIComponent(val)}&busId=${bus.id}&eventId=${bus.eventId}`,
        { cache: 'no-store' }
      )
      setLookup(await res.json())
    } catch { showToast('Lookup failed', 'error') }
    finally { setLookupLoading(false) }
  }, [bus.id, bus.eventId])

  function handleRefIdChange(val: string) {
    const numeric = val.replace(/[^0-9]/g, "")
    setRefId(numeric)
    setLookup(null)
    setWarning(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doLookup(numeric), 250)
  }

  async function handleBoard(overrideWarning = false) {
    if (!lookup?.passenger) return
    const p = lookup.passenger
    if (p.seatedBusId === bus.id) { showToast('Already boarded on this bus', 'info'); return }
    if (p.seatedBusId && p.seatedBusId !== bus.id) { showToast(`Already seated on Bus #${p.seatedBusInfo?.busNumber}`, 'error'); return }
    if (!overrideWarning && p.assignedBusId && p.assignedBusId !== bus.id) {
      setWarning(`Assigned to Bus #${p.assignedBusInfo?.busNumber} - ${p.assignedBusInfo?.busName}. Board here anyway?`)
      return
    }
    setWarning(null)
    setConfirming(true)
    try {
      const res = await fetch('/api/boarding/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerId: p.id, busId: bus.id }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Failed', 'error'); return }
      if (data.status === 'already_boarded') { showToast('Already boarded', 'info'); return }
      showToast(`Boarded: ${p.name}`, 'success')
      setSeated(s => s + 1)
      setSeatedList(list => [{
        id: p.id, name: p.name, refId, gender: p.gender, age: p.age,
        seatedAt: new Date(), seatedByUsername: session.username,
      }, ...list])
      setRefId('')
      setLookup(null)
      inputRef.current?.focus()
    } catch { showToast('Network error', 'error') }
    finally { setConfirming(false) }
  }

  async function handleRemove(passengerId: string, name: string) {
    if (!confirm(`Remove ${name} from bus?`)) return
    try {
      const res = await fetch('/api/boarding/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerId }),
      })
      if (res.ok) {
        showToast(`${name} removed`, 'info')
        setSeated(s => Math.max(0, s - 1))
        setSeatedList(list => list.filter(p => p.id !== passengerId))
      } else {
        const d = await res.json()
        showToast(d.error ?? 'Failed', 'error')
      }
    } catch { showToast('Network error', 'error') }
  }

  async function handleRosterBoard(passenger: Passenger) {
    setConfirming(true)
    try {
      const res = await fetch('/api/boarding/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerId: passenger.id, busId: bus.id }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Failed', 'error'); return }
      showToast(`Boarded: ${passenger.name}`, 'success')
      setSeated(s => s + 1)
      setSeatedList(list => [{
        id: passenger.id, name: passenger.name, refId: passenger.refId,
        gender: passenger.gender, age: passenger.age,
        seatedAt: new Date(), seatedByUsername: session.username,
      }, ...list])
      router.refresh()
    } catch { showToast('Network error', 'error') }
    finally { setConfirming(false) }
  }

  const p = lookup?.passenger
  const pct = Math.round((seated / bus.capacity) * 100)
  const tabs = [
    { key: 'confirm', label: 'Scan & Confirm' },
    ...(hasAnyAssignments ? [{ key: 'roster', label: `Roster (${assignedPassengers.length})` }] : []),
    { key: 'seated', label: `Seated (${seatedList.length})` },
  ] as const

  return (
    <div className="container-fluid py-3 px-3" style={{ maxWidth: 560, margin: '0 auto' }}>

      {/* Bus header */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="d-flex align-items-center gap-3">
            <CapacityRing seated={seated} capacity={bus.capacity} size={80} />
            <div className="flex-grow-1 min-w-0">
              <div className="text-muted small">{event.name}</div>
              <h5 className="fw-bold mb-0">Bus #{bus.busNumber} — {bus.busName}</h5>
              <div className="small text-muted">Leader: {bus.groupLeaderName}</div>
              <div className="small text-muted">{bus.groupLeaderContact}</div>
            </div>
          </div>
          <div className="mt-2">
            <div className="progress" style={{ height: 8 }}>
              <div
                className={`progress-bar ${pct >= 100 ? 'bg-danger' : pct >= 85 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="d-flex justify-content-between mt-1" style={{ fontSize: '0.75rem' }}>
              <span className="text-muted">{seated} seated</span>
              <span className="text-muted">{bus.capacity - seated} remaining</span>
            </div>
          </div>
          {isFull && (
            <div className="alert alert-danger py-1 px-3 mb-0 mt-2 text-center fw-bold" style={{ fontSize: '0.85rem' }}>
              BUS FULL
            </div>
          )}
          {isArchived && (
            <div className="alert alert-warning py-1 px-3 mb-0 mt-2 text-center" style={{ fontSize: '0.85rem' }}>
              Event archived — read only
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills nav-fill mb-3 gap-1">
        {tabs.map(t => (
          <li className="nav-item" key={t.key}>
            <button
              className={`nav-link w-100 py-2 ${tab === t.key ? 'active' : 'text-secondary bg-white border'}`}
              style={{ fontSize: '0.82rem', borderRadius: '0.5rem' }}
              onClick={() => setTab(t.key as any)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Confirm tab */}
      {tab === 'confirm' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-3">
            <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Passenger Ref ID</label>
            <div className="input-group mb-2">
              <input
                ref={inputRef}
                value={refId}
                onChange={e => handleRefIdChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isFull && !isArchived && p && !p.seatedBusId && handleBoard()}
                placeholder="Scan or type numeric ID..." inputMode="numeric" pattern="[0-9]*"
                disabled={isFull || isArchived}
                className="form-control form-control-lg"
                autoComplete="off"
              />
              {refId && (
                <button className="btn btn-outline-secondary" onClick={() => { setRefId(''); setLookup(null); setWarning(null); inputRef.current?.focus() }}>X</button>
              )}
            </div>

            {lookupLoading && <p className="text-muted small">Looking up...</p>}

            {lookup && !lookupLoading && (
              <div className="mt-2">
                {!lookup.found ? (
                  <div className="alert alert-danger py-2 small mb-0">Passenger not found</div>
                ) : (
                  <>
                    <div className="card bg-light border-0 mb-2">
                      <div className="card-body py-2 px-3">
                        <div className="fw-semibold">{p!.name}</div>
                        <div className="text-muted small">
                          {[p!.gender, p!.age ? `${p!.age} yrs` : null].filter(Boolean).join(' · ')}
                        </div>
                        {p!.seatedBusId === bus.id && <div className="text-success small mt-1 fw-medium">Already boarded on this bus</div>}
                        {p!.seatedBusId && p!.seatedBusId !== bus.id && <div className="text-danger small mt-1">Seated on Bus #{p!.seatedBusInfo?.busNumber}</div>}
                        {!p!.seatedBusId && p!.assignedBusId && p!.assignedBusId !== bus.id && (
                          <div className="text-warning small mt-1">Assigned to Bus #{p!.assignedBusInfo?.busNumber}</div>
                        )}
                      </div>
                    </div>

                    {warning && (
                      <div className="alert alert-warning py-2 mb-2" style={{ fontSize: '0.85rem' }}>
                        <p className="mb-2">{warning}</p>
                        <div className="d-flex gap-2">
                          <button onClick={() => handleBoard(true)} disabled={confirming} className="btn btn-warning btn-sm">Board anyway</button>
                          <button onClick={() => setWarning(null)} className="btn btn-outline-secondary btn-sm">Cancel</button>
                        </div>
                      </div>
                    )}

                    {!warning && !p!.seatedBusId && !isFull && !isArchived && (
                      <button onClick={() => handleBoard()} disabled={confirming} className="btn btn-success w-100">
                        {confirming ? (
                          <><span className="spinner-border spinner-border-sm me-1" />Confirming...</>
                        ) : 'Confirm Boarding'}
                      </button>
                    )}
                    {isFull && !p!.seatedBusId && <p className="text-danger text-center small fw-medium mb-0">Bus is full</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roster tab */}
      {tab === 'roster' && hasAnyAssignments && (
        <div className="card border-0 shadow-sm">
          {assignedPassengers.length === 0 ? (
            <div className="card-body text-center text-muted py-5">No passengers assigned to this bus</div>
          ) : (
            <div className="list-group list-group-flush">
              {assignedPassengers.map(ap => {
                const isSeatedHere = seatedList.some(s => s.id === ap.id)
                return (
                  <div key={ap.id} className="list-group-item d-flex align-items-center gap-2 py-2">
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-medium" style={{ fontSize: '0.875rem' }}>{ap.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{ap.refId}</div>
                    </div>
                    {isSeatedHere ? (
                      <span className="badge bg-success-subtle text-success-emphasis">Boarded</span>
                    ) : ap.seatedBusId && ap.seatedBusId !== bus.id ? (
                      <span className="badge bg-danger-subtle text-danger-emphasis">Other bus</span>
                    ) : (
                      <button onClick={() => handleRosterBoard(ap)} disabled={confirming || isFull || isArchived} className="btn btn-primary btn-sm">
                        Board
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Seated tab */}
      {tab === 'seated' && (
        <div className="card border-0 shadow-sm">
          {seatedList.length === 0 ? (
            <div className="card-body text-center text-muted py-5">No passengers seated yet</div>
          ) : (
            <div className="list-group list-group-flush">
              {seatedList.map(sp => (
                <div key={sp.id} className="list-group-item d-flex align-items-center gap-2 py-2">
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-medium" style={{ fontSize: '0.875rem' }}>{sp.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{sp.refId}</div>
                  </div>
                  {sp.seatedAt && (
                    <div className="text-muted d-none d-sm-block" style={{ fontSize: '0.72rem' }}>
                      {new Date(sp.seatedAt).toLocaleTimeString()}
                    </div>
                  )}
                  {!isArchived && (
                    <button onClick={() => handleRemove(sp.id, sp.name)} className="btn btn-outline-danger btn-sm" style={{ fontSize: '0.75rem' }}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
