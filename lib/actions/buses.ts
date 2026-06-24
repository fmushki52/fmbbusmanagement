'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { buses, passengers, events } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { auditLog } from '@/lib/db/schema'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') throw new Error('Unauthorized')
  return session
}

export async function createBus(formData: FormData) {
  const session = await requireAdmin()
  const eventId = formData.get('eventId') as string

  await db.insert(buses).values({
    eventId,
    busNumber: formData.get('busNumber') as string,
    busName: formData.get('busName') as string,
    groupLeaderName: formData.get('groupLeaderName') as string,
    groupLeaderContact: formData.get('groupLeaderContact') as string,
    capacity: parseInt(formData.get('capacity') as string, 10),
  })

  await db.insert(auditLog).values({
    eventId,
    action: 'assign',
    performedBy: session.userId,
    note: `Bus created: ${formData.get('busNumber')}`,
  })

  revalidatePath('/admin/buses')
  revalidatePath('/admin')
  redirect(`/admin/buses?eventId=${eventId}`)
}

export async function updateBus(id: string, formData: FormData) {
  const session = await requireAdmin()
  const [bus] = await db.select().from(buses).where(eq(buses.id, id)).limit(1)
  if (!bus) throw new Error('Bus not found')

  await db.update(buses).set({
    busNumber: formData.get('busNumber') as string,
    busName: formData.get('busName') as string,
    groupLeaderName: formData.get('groupLeaderName') as string,
    groupLeaderContact: formData.get('groupLeaderContact') as string,
    capacity: parseInt(formData.get('capacity') as string, 10),
  }).where(eq(buses.id, id))

  revalidatePath('/admin/buses')
  redirect(`/admin/buses?eventId=${bus.eventId}`)
}

export async function deleteBus(id: string) {
  const session = await requireAdmin()
  const [bus] = await db.select().from(buses).where(eq(buses.id, id)).limit(1)
  if (!bus) return

  await db.update(passengers).set({ seatedBusId: null, seatedAt: null, seatedBy: null }).where(eq(passengers.seatedBusId, id))
  await db.update(passengers).set({ assignedBusId: null }).where(eq(passengers.assignedBusId, id))
  await db.delete(buses).where(eq(buses.id, id))

  await db.insert(auditLog).values({
    eventId: bus.eventId, busId: id, action: 'remove',
    performedBy: session.userId, note: `Bus deleted: ${bus.busNumber}`,
  })

  revalidatePath('/admin/buses')
  revalidatePath('/admin')
}

export async function bulkUpdateBuses(updates: {
  id: string; busNumber: string; busName: string;
  groupLeaderName: string; groupLeaderContact: string; capacity: number
}[]) {
  await requireAdmin()
  for (const u of updates) {
    await db.update(buses).set({
      busNumber: u.busNumber,
      busName: u.busName,
      groupLeaderName: u.groupLeaderName,
      groupLeaderContact: u.groupLeaderContact,
      capacity: u.capacity,
    }).where(eq(buses.id, u.id))
  }
  revalidatePath('/admin/buses')
}

export interface BusImportRow {
  busNumber: string
  busName: string
  groupLeaderName: string
  groupLeaderContact: string
  capacity: number
}

export interface BusImportResult {
  imported: number
  errors: { row: number; busNumber: string; error: string }[]
}

export async function bulkImportBuses(eventId: string, rows: BusImportRow[]): Promise<BusImportResult> {
  await requireAdmin()

  const existing = await db.select({ busNumber: buses.busNumber }).from(buses).where(eq(buses.eventId, eventId))
  const existingNums = new Set(existing.map((b) => b.busNumber))

  const errors: BusImportResult['errors'] = []
  const toInsert: typeof buses.$inferInsert[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.busNumber) { errors.push({ row: i + 1, busNumber: '', error: 'Missing bus_number' }); continue }
    if (existingNums.has(row.busNumber)) { errors.push({ row: i + 1, busNumber: row.busNumber, error: 'Bus number already exists' }); continue }
    existingNums.add(row.busNumber)
    toInsert.push({
      eventId,
      busNumber: row.busNumber,
      busName: row.busName || `Bus ${row.busNumber}`,
      groupLeaderName: row.groupLeaderName || 'TBD',
      groupLeaderContact: row.groupLeaderContact || '',
      capacity: row.capacity || 45,
    })
  }

  if (toInsert.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await db.insert(buses).values(toInsert.slice(i, i + CHUNK))
    }
  }

  revalidatePath('/admin/buses')
  revalidatePath('/admin')
  return { imported: toInsert.length, errors }
}
