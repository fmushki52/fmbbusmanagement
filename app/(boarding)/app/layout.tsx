import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { ToastContainer } from '@/components/ui/Toast'

export default async function BoardingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || (session.role !== 'user' && session.role !== 'admin')) {
    redirect('/login')
  }
  return (
    <>
      {children}
      <ToastContainer />
    </>
  )
}
