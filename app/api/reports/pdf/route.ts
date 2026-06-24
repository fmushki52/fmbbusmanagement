import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getEventSummaryData, getBusReportData } from '@/lib/reports/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROW_HEIGHT = 18
const START_X = 40
const HEADER_COLOR = '#6366f1'
const TEXT_DARK = '#111827'
const LIGHT_GRAY = '#f3f4f6'

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

  function heading(text: string) {
    doc.fontSize(14).fillColor(HEADER_COLOR).text(text).moveDown(0.3)
    doc.fontSize(10).fillColor(TEXT_DARK)
  }

  function infoRow(label: string, value: string) {
    doc.fontSize(9).fillColor('#6b7280').text(`${label}: `, { continued: true })
       .fillColor(TEXT_DARK).text(value).moveDown(0.2)
  }

  function tableHeader(cols: string[], widths: number[]) {
    const totalWidth = widths.reduce((a, b) => a + b, 0)
    const y = doc.y
    doc.rect(START_X, y, totalWidth, ROW_HEIGHT).fill(HEADER_COLOR)
    doc.fillColor('white').fontSize(8)
    let x = START_X
    cols.forEach((col, i) => {
      doc.text(col, x + 3, y + 5, { width: widths[i] - 6, lineBreak: false })
      x += widths[i]
    })
    doc.y = y + ROW_HEIGHT
    doc.fillColor(TEXT_DARK)
  }

  function tableRow(vals: string[], widths: number[], shade: boolean) {
    if (doc.y + ROW_HEIGHT > doc.page.height - doc.page.margins.bottom) doc.addPage()
    const totalWidth = widths.reduce((a, b) => a + b, 0)
    const y = doc.y
    if (shade) doc.rect(START_X, y, totalWidth, ROW_HEIGHT).fill(LIGHT_GRAY)
    doc.fillColor(TEXT_DARK).fontSize(8)
    let x = START_X
    vals.forEach((v, i) => {
      doc.text(String(v), x + 3, y + 5, { width: widths[i] - 6, lineBreak: false, ellipsis: true })
      x += widths[i]
    })
    doc.y = y + ROW_HEIGHT
  }

  function formatDate(d: Date | string | null | undefined): string {
    if (!d) return '—'
    const dt = typeof d === 'string' ? new Date(d) : d
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  if (type === 'bus') {
    const data = await getBusReportData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    heading(`Bus Report: #${data.bus.busNumber} – ${data.bus.busName}`)
    infoRow('Event', data.event.name)
    infoRow('Group Leader', `${data.bus.groupLeaderName} (${data.bus.groupLeaderContact})`)
    infoRow('Capacity', `${data.bus.capacity}  |  Seated: ${data.seated}  |  Remaining: ${data.bus.capacity - data.seated}`)
    doc.moveDown(0.5)

    const widths = [55, 130, 35, 30, 65, 115, 85]
    tableHeader(['Ref ID', 'Name', 'Gender', 'Age', 'Status', 'Onboard Date', 'Confirmed By'], widths)

    data.passengers.forEach((p, i) => {
      const status = p.seatedBusId === id ? 'Boarded' : 'Not Boarded'
      tableRow(
        [p.refId, p.name, p.gender ?? '', String(p.age ?? ''), status, formatDate(p.seatedAt), p.confirmedBy ?? ''],
        widths, i % 2 === 0
      )
    })

  } else if (type === 'event') {
    const data = await getEventSummaryData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    heading(`Event Summary: ${data.event.name}`)
    if (data.event.eventDate) infoRow('Date', data.event.eventDate)
    doc.moveDown(0.5)

    doc.fontSize(11).fillColor(HEADER_COLOR).text('Buses').moveDown(0.3)
    const busWidths = [40, 110, 110, 110, 55, 55, 55]
    tableHeader(['#', 'Bus Name', 'Leader', 'Contact', 'Capacity', 'Seated', 'Remaining'], busWidths)

    data.buses.forEach((b, i) => {
      tableRow(
        [b.busNumber, b.busName, b.groupLeaderName, b.groupLeaderContact, String(b.capacity), String(b.seated), String(b.remaining)],
        busWidths, i % 2 === 0
      )
    })

    if (data.unseatedPassengers.length > 0) {
      doc.moveDown(0.5).fontSize(11).fillColor(HEADER_COLOR).text('Unseated Passengers').moveDown(0.3)
      const upWidths = [90, 160, 55, 40]
      tableHeader(['Ref ID', 'Name', 'Gender', 'Age'], upWidths)
      data.unseatedPassengers.forEach((p, i) => {
        tableRow([p.refId, p.name, p.gender ?? '', String(p.age ?? '')], upWidths, i % 2 === 0)
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
