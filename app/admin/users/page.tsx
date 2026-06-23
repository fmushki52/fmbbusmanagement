import { db } from '@/lib/db'
import { users, userBuses, buses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ToggleUserButton } from './ToggleUserButton'

export const dynamic = 'force-dynamic'

const roleBadge: Record<string, string> = {
  admin: 'bg-primary',
  user: 'bg-success',
  reporter: 'bg-warning text-dark',
}

export default async function UsersPage() {
  const userList = await db.select().from(users).orderBy(users.username)

  const userBusMappings = await db
    .select({ userId: userBuses.userId, busId: userBuses.busId, busNumber: buses.busNumber, busName: buses.busName })
    .from(userBuses)
    .innerJoin(buses, eq(userBuses.busId, buses.id))

  const mappingsByUser = userBusMappings.reduce((acc, m) => {
    if (!acc[m.userId]) acc[m.userId] = []
    acc[m.userId].push(m)
    return acc
  }, {} as Record<string, typeof userBusMappings>)

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="h3 fw-bold mb-0">Users</h2>
        <Link href="/admin/users/new" className="btn btn-primary">+ New User</Link>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Buses</th>
                <th>Status</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => {
                const userBusList = mappingsByUser[user.id] ?? []
                return (
                  <tr key={user.id}>
                    <td className="fw-medium">{user.username}</td>
                    <td><span className={`badge ${roleBadge[user.role] ?? 'bg-secondary'}`}>{user.role}</span></td>
                    <td className="small text-muted">{userBusList.length > 0 ? userBusList.map(b => `#${b.busNumber}`).join(', ') : '—'}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link href={`/admin/users/${user.id}/edit`} className="link-primary small">Edit</Link>
                        <ToggleUserButton userId={user.id} isActive={user.isActive} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {userList.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted py-4">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
