'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, getTxDb } from '@/lib/db'
import { passengers, buses, events, auditLog } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') throw new Error('Unauthorized')
  return session
}

export async function createPassenger(formData: FormData) {
  const session = await requireAdmin()
  const eventId = formData.get('eventId') as string

  await db.insert(passengers).values({
    eventId,
    refId: formData.get('refId') as string,
    name: formData.get('name') as string,
    gender: (formData.get('gender') as string) || null,
    age: formData.get('age') ? parseInt(formData.get('age') as string, 10) : null,
    assignedBusId: (formData.get('assignedBusId') as string) || null,
  })

  await db.insert(auditLog).values({
    eventId,
    action: 'assign',
    performedBy: session.userId,
    note: `Passenger added: ${formData.get('name')}`,
  })

  revalidatePath('/admin/passengers')
  redirect(`/admin/passengers?eventId=${eventId}`)
}

export async function updatePassenger(id: string, formData: FormData) {
  const session = await requireAdmin()
  const [passenger] = await db.select().from(passengers).where(eq(passengers.id, id)).limit(1)
  if (!passenger) throw new Error('Not found')

  await db.update(passengers).set({
    refId: formData.get('refId') as string,
    name: formData.get('name') as string,
    gender: (formData.get('gender') as string) || null,
    age: formData.get('age') ? parseInt(formData.get('age') as string, 10) : null,
    assignedBusId: (formData.get('assignedBusId') as string) || null,
  }).where(eq(passengers.id, id))

  revalidatePath('/admin/passengers')
  redirect(`/admin/passengers?eventId=${passenger.eventId}`)
}

export async function deletePassenger(id: string) {
  const session = await requireAdmin()
  const [p] = await db.select().from(passengers).where(eq(passengers.id, id)).limit(1)
  if (!p) return

  await db.delete(passengers).where(eq(passengers.id, id))

  await db.insert(auditLog).values({
    eventId: p.eventId,
    passengerId: id,
    action: 'remove',
    performedBy: session.userId,
    note: `Passenger deleted: ${p.name}`,
  })

  revalidatePath('/admin/passengers')
}

export async function adminBoardPassenger(passengerId: string, busId: string) {
  const session = await requireAdmin()
  const txDb = getTxDb()

  return await txDb.transaction(async (tx) => {
    const [bus] = await tx.execute(
      `SELECT * FROM buses WHERE id = '${busId}' FOR UPDATE`
    ) as any

    if (!bus) throw new Error('Bus not found')

    const [{ count }] = await tx.execute(
      `SELECT count(*)::int as count FROM passengers WHERE seated_bus_id = '${busId}'`
    ) as any

    if (count >= bus.capacity) {
      throw new Error('Bus full')
    }

    const [p] = await tx.execute(
      `SELECT * FROM passengers WHERE id = '${passengerId}' FOR UPDATE`
    ) as any

    if (!p) throw new Error('Passenger not found')

    const action = p.seated_bus_id && p.seated_bus_id !== busId ? 'reassign' : 'board'

    await tx.execute(`
      UPDATE passengers
      SET seated_bus_id = '${busId}', seated_at = now(), seated_by = '${session.userId}'
      WHERE id = '${passengerId}'
    `)

    await tx.execute(`
      INSERT INTO audit_log (id, event_id, bus_id, passenger_id, action, performed_by, note)
      VALUES (gen_random_uuid(), '${p.event_id}', '${busId}', '${passengerId}', '${action}', '${session.userId}',
        'Admin boarding')
    `)

    return { ok: true }
  })
}

export async function adminRemovePassenger(passengerId: string) {
  const session = await requireAdmin()
  const [p] = await db.select().from(passengers).where(eq(passengers.id, passengerId)).limit(1)
  if (!p || !p.seatedBusId) return

  const prevBusId = p.seatedBusId

  await db.update(passengers).set({
    seatedBusId: null,
    seatedAt: null,
    seatedBy: null,
  }).where(eq(passengers.id, passengerId))

  await db.insert(auditLog).values({
    eventId: p.eventId,
    busId: prevBusId,
    passengerId,
    action: 'remove',
    performedBy: session.userId,
    note: 'Admin removal',
  })

  revalidatePath('/admin/passengers')
  revalidatePath('/app')
}

export async function bulkDeletePassengers(ids: string[]) {
  const session = await requireAdmin()
  if (ids.length === 0) return

  await db.delete(passengers).where(inArray(passengers.id, ids))
  revalidatePath('/admin/passengers')
}

export async function bulkAssignPassengers(ids: string[], busId: string | null) {
  const session = await requireAdmin()
  if (ids.length === 0) return

  await db.update(passengers)
    .set({ assignedBusId: busId })
    .where(inArray(passengers.id, ids))

  revalidatePath('/admin/passengers')
}

export interface ImportRow {
  refId: string
  name: string
  gender?: string
  age?: number | null
  assignedBusNumber?: string
}

export interface ImportResult {
  imported: number
  errors: { row: number; refId: string; error: string }[]
}

export async function bulkImportPassengers(
  eventId: string,
  rows: ImportRow[]
): Promise<ImportResult> {
  const session = await requireAdmin()

  const busList = await db.select().from(buses).where(eq(buses.eventId, eventId))
  const busMap = Object.fromEntries(busList.map((b) => [b.busNumber, b.id]))

  const existingPassengers = await db.select({ refId: passengers.refId })
    .from(passengers)
    .where(eq(passengers.eventId, eventId))
  const existingRefIds = new Set(existingPassengers.map((p) => p.refId))

  const errors: ImportResult['errors'] = []
  const toInsert: typeof passengers.$inferInsert[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.refId || !row.name) {
      errors.push({ row: i + 1, refId: row.refId ?? '', error: 'Missing ref_id or name' })
      continue
    }
    if (existingRefIds.has(row.refId)) {
      errors.push({ row: i + 1, refId: row.refId, error: 'Duplicate ref_id in event' })
      continue
    }
    let assignedBusId: string | null = null
    if (row.assignedBusNumber) {
      assignedBusId = busMap[row.assignedBusNumber] ?? null
      if (!assignedBusId) {
        errors.push({ row: i + 1, refId: row.refId, error: `Bus number "${row.assignedBusNumber}" not found` })
        continue
      }
    }
    existingRefIds.add(row.refId) // prevent duplicates within import batch
    toInsert.push({
      eventId,
      refId: row.refId,
      name: row.name,
      gender: row.gender || null,
      age: row.age ?? null,
      assignedBusId,
    })
  }

  // Chunked inserts
  const CHUNK = 500
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    await db.insert(passengers).values(toInsert.slice(i, i + CHUNK))
  }

  await db.insert(auditLog).values({
    eventId,
    action: 'assign',
    performedBy: session.userId,
    note: `Bulk import: ${toInsert.length} passengers added`,
  })

  revalidatePath('/admin/passengers')
  return { imported: toInsert.length, errors }
}
