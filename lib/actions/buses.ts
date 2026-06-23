'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { buses, passengers } from '@/lib/db/schema'
import { eq, and, or } from 'drizzle-orm'
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

  // Clear seated/assigned refs
  await db.update(passengers)
    .set({ seatedBusId: null, seatedAt: null, seatedBy: null })
    .where(eq(passengers.seatedBusId, id))

  await db.update(passengers)
    .set({ assignedBusId: null })
    .where(eq(passengers.assignedBusId, id))

  await db.delete(buses).where(eq(buses.id, id))

  await db.insert(auditLog).values({
    eventId: bus.eventId,
    busId: id,
    action: 'remove',
    performedBy: session.userId,
    note: `Bus deleted: ${bus.busNumber}`,
  })

  revalidatePath('/admin/buses')
  revalidatePath('/admin')
}
