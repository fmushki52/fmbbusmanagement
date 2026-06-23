import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { NavBar } from '@/components/ui/NavBar'
import { ToastContainer } from '@/components/ui/Toast'

export default async function ReporterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || (session.role !== 'reporter' && session.role !== 'admin')) {
    redirect('/login')
  }

  return (
    <>
      <NavBar role={session.role} username={session.username} />
      <main className="container py-4" style={{ maxWidth: 720 }}>{children}</main>
      <ToastContainer />
    </>
  )
}
