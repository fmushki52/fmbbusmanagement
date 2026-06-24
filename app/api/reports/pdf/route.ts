import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getEventSummaryData, getBusReportData } from '@/lib/reports/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROW_HEIGHT = 18
const START_X = 40
const HEADER_COLOR = '#1a237e'
const LIGHT_GRAY = '#f0f2f7'
const TEXT_DARK = '#111827'
const TEXT_MUTED = '#6b7280'

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
  const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  function heading(text: string) {
    doc.fontSize(18).fillColor(HEADER_COLOR).text(text).moveDown(0.4)
  }

  function subheading(text: string) {
    doc.fontSize(13).fillColor(HEADER_COLOR).text(text).moveDown(0.3)
    doc.fontSize(9).fillColor(TEXT_DARK)
  }

  function metaRow(label: string, value: string) {
    doc.fontSize(9).fillColor(TEXT_MUTED).text(`${label}: `, { continued: true })
       .fillColor(TEXT_DARK).text(value)
  }

  function tableHeader(cols: string[], widths: number[]) {
    const totalWidth = widths.reduce((a, b) => a + b, 0)
    const y = doc.y
    doc.rect(START_X, y, totalWidth, ROW_HEIGHT).fill(HEADER_COLOR)
    doc.fillColor('white').fontSize(8)
    let x = START_X
    cols.forEach((col, i) => {
      doc.text(col, x + 4, y + 5, { width: widths[i] - 8, lineBreak: false })
      x += widths[i]
    })
    doc.y = y + ROW_HEIGHT + 1
    doc.fillColor(TEXT_DARK)
  }

  function tableRow(vals: string[], widths: number[], shade: boolean) {
    // Check if we need a new page
    if (doc.y + ROW_HEIGHT > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
    }
    const totalWidth = widths.reduce((a, b) => a + b, 0)
    const y = doc.y
    if (shade) {
      doc.rect(START_X, y, totalWidth, ROW_HEIGHT).fill(LIGHT_GRAY)
    }
    doc.fillColor(TEXT_DARK).fontSize(8)
    let x = START_X
    vals.forEach((v, i) => {
      doc.text(String(v), x + 3, y + 5, { width: widths[i] - 6, lineBreak: false, ellipsis: true })
      x += widths[i]
    })
    doc.y = y + ROW_HEIGHT
  }

  if (type === 'bus') {
    const data = await getBusReportData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    heading(`Bus Report: #${data.bus.busNumber} – ${data.bus.busName}`)
    metaRow('Event', data.event.name)
    metaRow('Group Leader', `${data.bus.groupLeaderName} (${data.bus.groupLeaderContact})`)
    metaRow('Capacity', `${data.bus.capacity}   Seated: ${data.seated}   Remaining: ${data.bus.capacity - data.seated}`)
    doc.moveDown(0.8)

    const widths = [75, 130, 40, 30, 85, 100, 95]
    tableHeader(['Ref ID', 'Name', 'Gender', 'Age', 'Status', 'Confirmed At', 'Confirmed By'], widths)

    data.passengers.forEach((p, i) => {
      const status = p.seatedBusId === id ? 'Boarded' : 'Not Boarded'
      tableRow([
        p.refId,
        p.name,
        p.gender ?? '',
        String(p.age ?? ''),
        status,
        p.seatedAt ? new Date(p.seatedAt).toLocaleString() : '',
        p.confirmedBy ?? '',
      ], widths, i % 2 === 0)
    })

  } else if (type === 'event') {
    const data = await getEventSummaryData(id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    heading(`Event Summary: ${data.event.name}`)
    if (data.event.eventDate) metaRow('Date', data.event.eventDate)
    doc.moveDown(0.8)

    subheading('Buses')
    const busWidths = [35, 110, 110, 110, 60, 55, 60]
    tableHeader(['#', 'Bus Name', 'Leader', 'Contact', 'Capacity', 'Seated', 'Remaining'], busWidths)

    data.buses.forEach((b, i) => {
      tableRow([
        b.busNumber,
        b.busName,
        b.groupLeaderName,
        b.groupLeaderContact,
        String(b.capacity),
        String(b.seated),
        String(b.remaining),
      ], busWidths, i % 2 === 0)
    })

    if (data.unseatedPassengers.length > 0) {
      doc.moveDown(0.8)
      subheading('Unseated Passengers')
      const upWidths = [90, 180, 60, 40]
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
