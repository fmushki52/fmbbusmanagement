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
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  if (!type || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const PDFDocument = (await import('pdfkit')).default
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const headerColor = '#6366f1'
  const lightGray = '#f3f4f6'

  function heading(text: string) {
    doc.fontSize(16).fillColor(headerColor).text(text).moveDown(0.3)
    doc.fontSize(10).fillColor('#374151')
  }

  function row(label: string, value: string) {
    doc.fontSize(10).fillColor('#6b7280').text(`${label}: `, { continued: true })
       .fillColor('#111827').text(value).moveDown(0.2)
  }

  function tableHeader(cols: string[], widths: number[]) {
    const startX = 40
    let x = startX
    doc.rect(x, doc.y, widths.reduce((a, b) => a + b, 0), 18).fill(headerColor)
    doc.fillColor('white').fontSize(9)
    cols.forEach((col, i) => {
      doc.text(col, x + 4, doc.y - 14, { width: widths[i] - 4 })
      x += widths[i]
    })
    doc.moveDown(0.2).fillColor('#111827')
  }

  if (type === 'bus') {
    const data = await getBusReportData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    heading(`Bus Report: #${data.bus.busNumber} – ${data.bus.busName}`)
    row('Event', data.event.name)
    row('Group Leader', `${data.bus.groupLeaderName} (${data.bus.groupLeaderContact})`)
    row('Capacity', `${data.bus.capacity} | Seated: ${data.seated} | Remaining: ${data.bus.capacity - data.seated}`)
    doc.moveDown(0.5)

    const widths = [70, 120, 40, 30, 80, 90, 90]
    tableHeader(['Ref ID', 'Name', 'Gender', 'Age', 'Status', 'Confirmed At', 'Confirmed By'], widths)

    data.passengers.forEach((p, i) => {
      const y = doc.y
      if (i % 2 === 0) {
        doc.rect(40, y, widths.reduce((a, b) => a + b, 0), 16).fill(lightGray)
      }
      doc.fillColor('#111827').fontSize(8)
      let x = 40
      const status = p.seatedBusId === id ? 'Boarded' : 'Not Boarded'
      const vals = [p.refId, p.name, p.gender ?? '', String(p.age ?? ''), status,
        p.seatedAt ? new Date(p.seatedAt).toLocaleString() : '', p.confirmedBy ?? '']
      vals.forEach((v, j) => {
        doc.text(v, x + 2, y + 2, { width: widths[j] - 4, ellipsis: true })
        x += widths[j]
      })
      doc.moveDown(0.15)
    })
  } else if (type === 'event') {
    const data = await getEventSummaryData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    heading(`Event Summary: ${data.event.name}`)
    if (data.event.eventDate) row('Date', data.event.eventDate)
    doc.moveDown(0.5)

    doc.fontSize(12).fillColor(headerColor).text('Buses').moveDown(0.3)
    const busWidths = [40, 100, 100, 110, 60, 60, 60]
    tableHeader(['#', 'Bus Name', 'Leader', 'Contact', 'Capacity', 'Seated', 'Remaining'], busWidths)

    data.buses.forEach((b, i) => {
      const y = doc.y
      if (i % 2 === 0) doc.rect(40, y, busWidths.reduce((a, c) => a + c, 0), 16).fill(lightGray)
      doc.fillColor('#111827').fontSize(8)
      let x = 40
      const vals = [b.busNumber, b.busName, b.groupLeaderName, b.groupLeaderContact, String(b.capacity), String(b.seated), String(b.remaining)]
      vals.forEach((v, j) => {
        doc.text(v, x + 2, y + 2, { width: busWidths[j] - 4 })
        x += busWidths[j]
      })
      doc.moveDown(0.15)
    })

    if (data.unseatedPassengers.length > 0) {
      doc.moveDown(0.5).fontSize(12).fillColor(headerColor).text('Unseated Passengers').moveDown(0.3)
      const upWidths = [90, 150, 60, 40]
      tableHeader(['Ref ID', 'Name', 'Gender', 'Age'], upWidths)
      data.unseatedPassengers.forEach((p, i) => {
        const y = doc.y
        if (i % 2 === 0) doc.rect(40, y, upWidths.reduce((a, c) => a + c, 0), 16).fill(lightGray)
        doc.fillColor('#111827').fontSize(8)
        let x = 40
        ;[p.refId, p.name, p.gender ?? '', String(p.age ?? '')].forEach((v, j) => {
          doc.text(v, x + 2, y + 2, { width: upWidths[j] - 4 })
          x += upWidths[j]
        })
        doc.moveDown(0.15)
      })
    }
  }

  doc.end()

  return new Promise<NextResponse>((resolve) => {
    doc.on('end', () => {
      const buf = Buffer.concat(chunks)
      resolve(new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}-report-${id.slice(0, 8)}.pdf"`,
        },
      }))
    })
  })
}
