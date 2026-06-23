'use client'
import { toggleUserActive } from '@/lib/actions/users'
import { useTransition } from 'react'

export function ToggleUserButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(() => toggleUserActive(userId, !isActive))}
      disabled={isPending}
      className={`btn btn-link btn-sm p-0 ${isActive ? 'text-danger' : 'text-success'}`}
    >
      {isPending ? '…' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  )
}
