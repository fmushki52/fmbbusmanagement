import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getEventSummaryData, getBusReportData } from '@/lib/reports/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'reporter')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // 'event' | 'bus'
  const id = searchParams.get('id')
  if (!type || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  if (type === 'event') {
    const data = await getEventSummaryData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Summary sheet
    const summary = wb.addWorksheet('Summary')
    summary.addRow(['Event:', data.event.name])
    summary.addRow(['Date:', data.event.eventDate ?? ''])
    summary.addRow([])
    summary.addRow(['Bus #', 'Bus Name', 'Group Leader', 'Contact', 'Capacity', 'Seated', 'Remaining'])
    data.buses.forEach((b) => {
      summary.addRow([b.busNumber, b.busName, b.groupLeaderName, b.groupLeaderContact, b.capacity, b.seated, b.remaining])
    })
    summary.addRow([])
    summary.addRow(['Unseated Passengers'])
    summary.addRow(['Ref ID', 'Name', 'Gender', 'Age'])
    data.unseatedPassengers.forEach((p) => {
      summary.addRow([p.refId, p.name, p.gender ?? '', p.age ?? ''])
    })

    // Per-bus sheets
    for (const bus of data.buses) {
      const busData = await getBusReportData(bus.id)
      if (!busData) continue
      const ws = wb.addWorksheet(`Bus ${bus.busNumber}`)
      ws.addRow(['Bus:', `#${bus.busNumber} – ${bus.busName}`])
      ws.addRow(['Leader:', `${bus.groupLeaderName} (${bus.groupLeaderContact})`])
      ws.addRow(['Capacity:', bus.capacity, 'Seated:', bus.seated, 'Remaining:', bus.remaining])
      ws.addRow([])
      ws.addRow(['Ref ID', 'Name', 'Gender', 'Age', 'Status', 'Confirmed At', 'Confirmed By'])
      busData.passengers.forEach((p) => {
        const status = p.seatedBusId === bus.id ? 'Boarded' : 'Assigned-Not-Boarded'
        ws.addRow([p.refId, p.name, p.gender ?? '', p.age ?? '', status,
          p.seatedAt ? new Date(p.seatedAt).toLocaleString() : '', p.confirmedBy ?? ''])
      })
    }
  } else if (type === 'bus') {
    const data = await getBusReportData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const ws = wb.addWorksheet(`Bus ${data.bus.busNumber}`)
    ws.addRow(['Event:', data.event.name])
    ws.addRow(['Bus:', `#${data.bus.busNumber} – ${data.bus.busName}`])
    ws.addRow(['Leader:', `${data.bus.groupLeaderName} (${data.bus.groupLeaderContact})`])
    ws.addRow(['Capacity:', data.bus.capacity, 'Seated:', data.seated, 'Remaining:', data.bus.capacity - data.seated])
    ws.addRow([])
    ws.addRow(['Ref ID', 'Name', 'Gender', 'Age', 'Status', 'Confirmed At', 'Confirmed By'])
    data.passengers.forEach((p) => {
      const status = p.seatedBusId === id ? 'Boarded' : 'Assigned-Not-Boarded'
      ws.addRow([p.refId, p.name, p.gender ?? '', p.age ?? '', status,
        p.seatedAt ? new Date(p.seatedAt).toLocaleString() : '', p.confirmedBy ?? ''])
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-report-${id.slice(0, 8)}.xlsx"`,
    },
  })
}
