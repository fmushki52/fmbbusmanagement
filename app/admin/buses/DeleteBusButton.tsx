'use client'

import { deleteBus } from '@/lib/actions/buses'
import { useTransition } from 'react'

export function DeleteBusButton({ busId, busNumber }: { busId: string; busNumber: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete bus #${busNumber}? Seated passengers will be unseated.`)) return
    startTransition(async () => {
      await deleteBus(busId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="btn-ghost px-2 py-1 text-xs text-red-500"
    >
      {isPending ? '…' : 'Del'}
    </button>
  )
}
