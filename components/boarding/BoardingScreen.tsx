'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
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
  bus,
  event,
  seated: initialSeated,
  assignedPassengers,
  seatedPassengers: initialSeated2,
  hasAnyAssignments,
  session,
}: Props) {
  const [tab, setTab] = useState<'confirm' | 'roster' | 'seated'>('confirm')
  const [refId, setRefId] = useState('')
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [seated, setSeated] = useState(initialSeated)
  const [seatedList, setSeatedList] = useState(initialSeated2)
  const [confirming, setConfirming] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isArchived = event.status === 'archived'
  const isFull = seated >= bus.capacity

  useEffect(() => {
    if (!hasAnyAssignments && !isArchived) {
      inputRef.current?.focus()
    }
  }, [hasAnyAssignments, isArchived])

  const doLookup = useCallback(async (val: string) => {
    if (!val.trim()) { setLookup(null); return }
    setLookupLoading(true)
    try {
      const res = await fetch(
        `/api/boarding/lookup?refId=${encodeURIComponent(val)}&busId=${bus.id}&eventId=${bus.eventId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setLookup(data)
    } catch {
      showToast('Lookup failed', 'error')
    } finally {
      setLookupLoading(false)
    }
  }, [bus.id, bus.eventId])

  function handleRefIdChange(val: string) {
    setRefId(val)
    setLookup(null)
    setWarning(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doLookup(val), 250)
  }

  async function handleBoard(overrideWarning = false) {
    if (!lookup?.passenger) return

    const p = lookup.passenger

    // Already on this bus
    if (p.seatedBusId === bus.id) {
      showToast('Passenger already boarded on this bus', 'info')
      return
    }

    // Seated on another bus
    if (p.seatedBusId && p.seatedBusId !== bus.id) {
      showToast(`Already seated on Bus #${p.seatedBusInfo?.busNumber}`, 'error')
      return
    }

    // Assigned to a different bus
    if (!overrideWarning && p.assignedBusId && p.assignedBusId !== bus.id) {
      setWarning(`This passenger is assigned to Bus #${p.assignedBusInfo?.busNumber} — ${p.assignedBusInfo?.busName}. Board here anyway?`)
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

      if (!res.ok) {
        showToast(data.error ?? 'Failed', 'error')
        return
      }

      if (data.status === 'already_boarded') {
        showToast('Already boarded', 'info')
        return
      }

      showToast(`✓ ${lookup.passenger!.name} boarded!`, 'success')
      setSeated((s) => s + 1)
      setSeatedList((list) => [{
        id: p.id,
        name: p.name,
        refId,
        gender: p.gender,
        age: p.age,
        seatedAt: new Date(),
        seatedByUsername: session.username,
      }, ...list])
      setRefId('')
      setLookup(null)
      inputRef.current?.focus()
    } catch {
      showToast('Network error', 'error')
    } finally {
      setConfirming(false)
    }
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
        setSeated((s) => Math.max(0, s - 1))
        setSeatedList((list) => list.filter((p) => p.id !== passengerId))
      } else {
        const d = await res.json()
        showToast(d.error ?? 'Failed', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
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
      showToast(`✓ ${passenger.name} boarded!`, 'success')
      setSeated((s) => s + 1)
      setSeatedList((list) => [{
        id: passenger.id,
        name: passenger.name,
        refId: passenger.refId,
        gender: passenger.gender,
        age: passenger.age,
        seatedAt: new Date(),
        seatedByUsername: session.username,
      }, ...list])
      router.refresh()
    } catch {
      showToast('Network error', 'error')
    } finally {
      setConfirming(false)
    }
  }

  const p = lookup?.passenger

  return (
    <div className="max-w-lg mx-auto p-4 pb-8">
      {/* Bus header */}
      <div className="glass-card p-5 mb-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <CapacityRing seated={seated} capacity={bus.capacity} size={100} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">{event.name}</p>
            <h2 className="text-xl font-bold">Bus #{bus.busNumber}</h2>
            <p className="font-medium text-gray-700 dark:text-gray-300">{bus.busName}</p>
            <p className="text-sm text-gray-500 mt-1">
              👤 {bus.groupLeaderName} · {bus.groupLeaderContact}
            </p>
          </div>
        </div>
        <div className="mt-4">
          
        </div>
        {isFull && (
          <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2 text-center text-red-600 font-bold text-sm">
            🚫 BUS FULL
          </div>
        )}
        {isArchived && (
          <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-xl px-4 py-2 text-center text-amber-600 text-sm">
            ⚠ Event archived — read only
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex gap-1 mb-4">
        {(['confirm', ...(hasAnyAssignments ? ['roster'] : []), 'seated'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-indigo-500 text-white shadow-sm' : 'hover:bg-white/20'
            }`}
          >
            {t === 'roster' ? `Roster (${assignedPassengers.length})` : t === 'seated' ? `Seated (${seatedList.length})` : 'Confirm'}
          </button>
        ))}
      </div>

      {/* Confirm tab */}
      {tab === 'confirm' && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass-card p-4">
            <label className="text-sm font-medium mb-2 block">Passenger Ref ID</label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={refId}
                onChange={(e) => handleRefIdChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isFull && !isArchived && p && !p.seatedBusId && handleBoard()}
                placeholder="Scan or type ref ID…"
                disabled={isFull || isArchived}
                className="glass-input flex-1 px-4 py-3 text-sm"
                autoComplete="off"
              />
              {refId && (
                <button onClick={() => { setRefId(''); setLookup(null); setWarning(null); inputRef.current?.focus() }}
                  className="btn-ghost px-3 py-2 text-sm">✕</button>
              )}
            </div>

            {lookupLoading && <p className="text-sm text-gray-400 mt-2">Looking up…</p>}

            {lookup && !lookupLoading && (
              <div className="mt-3 animate-slide-up">
                {!lookup.found ? (
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                    ✕ Passenger not found
                  </div>
                ) : (
                  <div>
                    <div className="glass-card p-4 mb-3">
                      <p className="font-semibold text-base">{p!.name}</p>
                      <p className="text-xs text-gray-500">
                        {[p!.gender, p!.age ? `${p!.age} yrs` : null].filter(Boolean).join(' · ')}
                      </p>
                      {p!.seatedBusId === bus.id && (
                        <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Already boarded on this bus</p>
                      )}
                      {p!.seatedBusId && p!.seatedBusId !== bus.id && (
                        <p className="text-xs text-red-500 mt-1 font-medium">
                          ✕ Seated on Bus #{p!.seatedBusInfo?.busNumber}
                        </p>
                      )}
                      {!p!.seatedBusId && p!.assignedBusId && p!.assignedBusId !== bus.id && (
                        <p className="text-xs text-amber-500 mt-1">
                          ⚠ Assigned to Bus #{p!.assignedBusInfo?.busNumber}
                        </p>
                      )}
                    </div>

                    {warning && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-xl p-3 mb-3">
                        <p className="text-sm text-amber-700 mb-2">{warning}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleBoard(true)} disabled={confirming}
                            className="btn-primary px-4 py-1.5 text-xs">Board anyway</button>
                          <button onClick={() => setWarning(null)} className="btn-ghost px-4 py-1.5 text-xs">Cancel</button>
                        </div>
                      </div>
                    )}

                    {!warning && !p!.seatedBusId && !isFull && !isArchived && (
                      <button
                        onClick={() => handleBoard()}
                        disabled={confirming}
                        className="btn-primary w-full py-3 text-sm"
                      >
                        {confirming ? 'Confirming…' : '✓ Confirm Boarding'}
                      </button>
                    )}
                    {isFull && !p!.seatedBusId && (
                      <p className="text-center text-red-500 text-sm font-medium">Bus is full</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roster tab */}
      {tab === 'roster' && hasAnyAssignments && (
        <div className="glass-card overflow-hidden animate-slide-up">
          {assignedPassengers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No passengers assigned to this bus</div>
          ) : (
            <div className="divide-y divide-white/10">
              {assignedPassengers.map((p) => {
                const isSeatedHere = seatedList.some((s) => s.id === p.id)
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.refId}</p>
                    </div>
                    {isSeatedHere ? (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 px-2 py-1 rounded-full">
                        ✓ Boarded
                      </span>
                    ) : p.seatedBusId && p.seatedBusId !== bus.id ? (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                        Other bus
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRosterBoard(p)}
                        disabled={confirming || isFull || isArchived}
                        className="btn-primary px-3 py-1 text-xs"
                      >
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
        <div className="glass-card overflow-hidden animate-slide-up">
          {seatedList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No passengers seated yet</div>
          ) : (
            <div className="divide-y divide-white/10">
              {seatedList.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.refId}</p>
                  </div>
                  {p.seatedAt && (
                    <p className="text-xs text-gray-400 hidden sm:block">
                      {new Date(p.seatedAt).toLocaleTimeString()}
                    </p>
                  )}
                  {!isArchived && (
                    <button
                      onClick={() => handleRemove(p.id, p.name)}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                    >
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
