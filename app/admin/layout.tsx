import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/ui/NavBar'
import { ToastContainer } from '@/components/ui/Toast'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  return (
    <>
      <NavBar role={session.role} username={session.username} />
      <main className="container-fluid py-4">
        <div className="row">
          <div className="col-12 col-xl-10 offset-xl-1">
            {children}
          </div>
        </div>
      </main>
      <ToastContainer />
    </>
  )
}
