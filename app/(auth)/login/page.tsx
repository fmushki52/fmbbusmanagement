'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'


export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      if (data.role === 'admin') router.push('/admin')
      else if (data.role === 'reporter') router.push('/reports')
      else router.push('/app')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)' }}
    >
      <div className="w-100 px-3" style={{ maxWidth: 420 }}>
        {/* Logo & brand */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)' }}>
            <img src="/logo.jpg" alt="FHK Logo" width={64} height={64} className="rounded-circle" style={{ objectFit: "cover" }} />
          </div>
          <h1 className="text-white fw-bold mb-1" style={{ fontSize: '1.5rem', letterSpacing: '0.5px' }}>FHK Bus Management</h1>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>Passenger Confirmation System</p>
        </div>

        {/* Card */}
        <div className="card border-0 rounded-4 shadow-lg" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)' }}>
          <div className="card-body p-4">
            {error && (
              <div className="alert alert-danger alert-dismissible py-2 small mb-3" role="alert">
                <span>⚠ {error}</span>
                <button type="button" className="btn-close btn-close-sm" onClick={() => setError('')} />
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.85rem' }} htmlFor="username">
                  Username
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0" style={{ color: '#5c6bc0' }}>👤</span>
                  <input
                    id="username"
                    type="text"
                    className="form-control form-control-lg border-start-0 ps-2"
                    placeholder="Enter username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.85rem' }} htmlFor="password">
                  Password
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0" style={{ color: '#5c6bc0' }}>🔒</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control form-control-lg border-start-0 border-end-0 ps-2"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ fontSize: '0.95rem' }}
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0"
                    onClick={() => setShowPassword(s => !s)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    style={{ cursor: 'pointer', color: '#5c6bc0' }}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-lg w-100 fw-semibold text-white"
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #1a237e, #1565c0)', border: 'none', borderRadius: '0.75rem', padding: '0.75rem', fontSize: '1rem' }}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Signing in…</>
                ) : '→  Sign In'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-3" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
          © FHK Bus Management System
        </p>
      </div>
    </div>
  )
}
