'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') throw new Error('Unauthorized')
  return session
}

export async function createEvent(formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const eventDate = formData.get('eventDate') as string

  await db.insert(events).values({
    name,
    description: description || null,
    eventDate: eventDate || null,
    status: 'active',
  })
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  redirect('/admin/events')
}

export async function updateEvent(id: string, formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const eventDate = formData.get('eventDate') as string
  const status = formData.get('status') as string

  await db.update(events).set({ name, description: description || null, eventDate: eventDate || null, status }).where(eq(events.id, id))
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  redirect('/admin/events')
}

export async function archiveEvent(id: string) {
  await requireAdmin()
  await db.update(events).set({ status: 'archived' }).where(eq(events.id, id))
  revalidatePath('/admin')
  revalidatePath('/admin/events')
}

export async function deleteEvent(id: string) {
  await requireAdmin()
  await db.delete(events).where(eq(events.id, id))
  revalidatePath('/admin')
  revalidatePath('/admin/events')
}
