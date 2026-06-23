'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavBarProps {
  role: string
  username: string
}

export function NavBar({ role, username }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const adminLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/events', label: 'Events' },
    { href: '/admin/buses', label: 'Buses' },
    { href: '/admin/passengers', label: 'Passengers' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/audit', label: 'Audit Log' },
  ]

  const links = role === 'admin' ? adminLinks
    : role === 'reporter' ? [{ href: '/reports', label: 'Reports' }]
    : [{ href: '/app', label: 'My Buses' }]

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" href={role === 'admin' ? '/admin' : role === 'reporter' ? '/reports' : '/app'}>
          🚌 BusBoard
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto">
            {links.map(link => (
              <li className="nav-item" key={link.href}>
                <Link
                  className={`nav-link ${pathname === link.href || pathname.startsWith(link.href + '/') ? 'active fw-semibold' : ''}`}
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-2">
            <span className="text-white-50 small d-none d-md-inline">{username}</span>
            <span className="badge bg-white text-primary">{role}</span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
