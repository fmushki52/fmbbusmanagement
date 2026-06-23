import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { passengers, buses, userBuses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const refId = searchParams.get('refId')?.trim()
  const busId = searchParams.get('busId')
  const eventId = searchParams.get('eventId')

  if (!refId || !busId || !eventId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const [passenger] = await db
    .select()
    .from(passengers)
    .where(and(eq(passengers.refId, refId), eq(passengers.eventId, eventId)))
    .limit(1)

  if (!passenger) {
    return NextResponse.json({ found: false })
  }

  let seatedBusInfo: { busNumber: string; busName: string } | null = null
  if (passenger.seatedBusId) {
    const [b] = await db.select({ busNumber: buses.busNumber, busName: buses.busName })
      .from(buses).where(eq(buses.id, passenger.seatedBusId)).limit(1)
    seatedBusInfo = b ?? null
  }

  let assignedBusInfo: { busNumber: string; busName: string } | null = null
  if (passenger.assignedBusId) {
    const [b] = await db.select({ busNumber: buses.busNumber, busName: buses.busName })
      .from(buses).where(eq(buses.id, passenger.assignedBusId)).limit(1)
    assignedBusInfo = b ?? null
  }

  return NextResponse.json({
    found: true,
    passenger: {
      id: passenger.id,
      name: passenger.name,
      gender: passenger.gender,
      age: passenger.age,
      seatedBusId: passenger.seatedBusId,
      seatedBusInfo,
      assignedBusId: passenger.assignedBusId,
      assignedBusInfo,
    },
  })
}
