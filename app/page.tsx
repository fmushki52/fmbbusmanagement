import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')
  if (session.role === 'user') redirect('/app')
  if (session.role === 'reporter') redirect('/reports')
  redirect('/login')
}
