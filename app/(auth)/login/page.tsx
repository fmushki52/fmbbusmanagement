'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    } catch (err) {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="w-100" style={{ maxWidth: 420 }}>
        <div className="card shadow-sm border-0 rounded-4 mx-3">
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="fs-1 mb-2">🚌</div>
              <h1 className="h4 fw-bold mb-1">BusBoard</h1>
              <p className="text-muted small">Passenger Confirmation System</p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-medium" htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="form-label fw-medium" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Signing in…</>
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center text-muted small mt-3">
          Demo: admin/admin123 · reporter/reporter123 · leader1/user1pass
        </p>
      </div>
    </div>
  )
}
