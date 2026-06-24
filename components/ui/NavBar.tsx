'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavBarProps {
  role: string
  username: string
}

export function NavBar({ role, username }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: '🏠' },
    { href: '/admin/events', label: 'Events', icon: '📅' },
    { href: '/admin/buses', label: 'Buses', icon: '🚌' },
    { href: '/admin/passengers', label: 'Passengers', icon: '👥' },
    { href: '/admin/users', label: 'Users', icon: '👤' },
    { href: '/admin/reports', label: 'Reports', icon: '📊' },
    { href: '/admin/audit', label: 'Audit', icon: '🔍' },
  ]

  const links = role === 'admin' ? adminLinks
    : role === 'reporter' ? [{ href: '/reports', label: 'Reports', icon: '📊' }]
    : [{ href: '/app', label: 'My Buses', icon: '🚌' }]

  const homeHref = role === 'admin' ? '/admin' : role === 'reporter' ? '/reports' : '/app'

  return (
    <nav className="navbar navbar-dark sticky-top" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      <div className="container-fluid px-3">
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center gap-2 py-1" href={homeHref}>
          <Image src="/logo.jfif" alt="FHK" width={36} height={36} className="rounded-circle border border-white border-opacity-50" style={{ objectFit: 'cover' }} />
          <span className="fw-bold d-none d-sm-inline" style={{ letterSpacing: '0.5px' }}>FHK Bus</span>
        </Link>

        {/* Desktop links */}
        <ul className="navbar-nav d-none d-lg-flex flex-row gap-1 me-auto ms-3">
          {links.map(link => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <li className="nav-item" key={link.href}>
                <Link
                  className={`nav-link px-3 py-2 rounded-3 d-flex align-items-center gap-1 ${active ? 'active fw-semibold bg-white bg-opacity-25' : ''}`}
                  href={link.href}
                  style={{ fontSize: '0.875rem' }}
                >
                  <span style={{ fontSize: '0.8rem' }}>{link.icon}</span>
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Right side */}
        <div className="d-flex align-items-center gap-2">
          <span className="badge rounded-pill text-bg-light text-primary d-none d-md-inline">{role}</span>
          <span className="text-white-50 small d-none d-lg-inline">{username}</span>
          <button
            className="btn btn-sm btn-outline-light d-none d-lg-inline-flex align-items-center gap-1"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ fontSize: '0.8rem' }}
          >
            {loggingOut ? <><span className="spinner-border spinner-border-sm" /> Logging out…</> : '⏻ Logout'}
          </button>

          {/* Mobile toggler */}
          <button
            className="navbar-toggler border-0 d-lg-none"
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            {open ? (
              <span style={{ fontSize: '1.4rem', color: 'white' }}>✕</span>
            ) : (
              <span className="navbar-toggler-icon" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="w-100 border-top border-white border-opacity-25" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="container-fluid py-2">
            <div className="d-flex align-items-center gap-2 px-2 py-2 mb-2 border-bottom border-white border-opacity-25">
              <Image src="/logo.jfif" alt="FHK" width={28} height={28} className="rounded-circle" style={{ objectFit: 'cover' }} />
              <div>
                <div className="text-white fw-semibold" style={{ fontSize: '0.85rem' }}>{username}</div>
                <span className="badge text-bg-light text-primary" style={{ fontSize: '0.65rem' }}>{role}</span>
              </div>
            </div>
            <div className="row g-1">
              {links.map(link => {
                const active = pathname === link.href || pathname.startsWith(link.href + '/')
                return (
                  <div className="col-6" key={link.href}>
                    <Link
                      className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none ${active ? 'bg-white text-primary fw-semibold' : 'text-white'}`}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      style={{ fontSize: '0.875rem', background: active ? undefined : 'rgba(255,255,255,0.1)' }}
                    >
                      <span>{link.icon}</span>
                      {link.label}
                    </Link>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 pt-2 border-top border-white border-opacity-25">
              <button
                className="btn btn-outline-light btn-sm w-100"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? <><span className="spinner-border spinner-border-sm me-1" /> Logging out…</> : '⏻ Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
