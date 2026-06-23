'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users, userBuses } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') throw new Error('Unauthorized')
  return session
}

export async function createUser(formData: FormData) {
  await requireAdmin()
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const busIds = formData.getAll('busIds') as string[]

  const passwordHash = await bcrypt.hash(password, 12)
  const [user] = await db.insert(users).values({ username, passwordHash, role }).returning({ id: users.id })

  if (busIds.length > 0 && role === 'user') {
    await db.insert(userBuses).values(busIds.map((busId) => ({ userId: user.id, busId })))
  }

  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin()
  const role = formData.get('role') as string
  const isActive = formData.get('isActive') === 'true'
  const busIds = formData.getAll('busIds') as string[]
  const newPassword = formData.get('newPassword') as string

  const updateData: Partial<typeof users.$inferInsert> = { role, isActive }
  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  await db.update(users).set(updateData).where(eq(users.id, id))

  // Re-sync bus mappings
  await db.delete(userBuses).where(eq(userBuses.userId, id))
  if (busIds.length > 0 && role === 'user') {
    await db.insert(userBuses).values(busIds.map((busId) => ({ userId: id, busId })))
  }

  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await requireAdmin()
  await db.update(users).set({ isActive }).where(eq(users.id, id))
  revalidatePath('/admin/users')
}
