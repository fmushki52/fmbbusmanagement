'use client'

import { useState, useTransition, useRef } from 'react'
import Papa from 'papaparse'
import { bulkImportBuses, type BusImportRow, type BusImportResult } from '@/lib/actions/buses'
import Link from 'next/link'

interface Props { eventId: string }

export function ImportBusForm({ eventId }: Props) {
  const [rows, setRows] = useState<BusImportRow[]>([])
  const [preview, setPreview] = useState<BusImportRow[]>([])
  const [result, setResult] = useState<BusImportResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setResult(null)

    if (file.name.endsWith('.csv')) {
      Papa.parse<Record<string, string>>(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => { const p = parseRows(res.data); setRows(p); setPreview(p.slice(0, 10)) },
      })
    } else if (file.name.match(/\.xlsx?$/)) {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      const headers: string[] = []
      const data: Record<string, string>[] = []
      ws.eachRow((row, ri) => {
        if (ri === 1) row.eachCell((c) => headers.push(String(c.value ?? '')))
        else {
          const obj: Record<string, string> = {}
          row.eachCell({ includeEmpty: true }, (c, ci) => { obj[headers[ci - 1]] = String(c.value ?? '') })
          data.push(obj)
        }
      })
      const p = parseRows(data); setRows(p); setPreview(p.slice(0, 10))
    } else {
      setError('Please upload a CSV or Excel file.')
    }
  }

  function parseRows(data: Record<string, string>[]): BusImportRow[] {
    return data.map((row) => ({
      busNumber: (row['bus_number'] ?? row['Bus Number'] ?? row['busNumber'] ?? '').trim(),
      busName: (row['bus_name'] ?? row['Bus Name'] ?? row['busName'] ?? '').trim(),
      groupLeaderName: (row['leader_name'] ?? row['Leader Name'] ?? row['groupLeaderName'] ?? '').trim(),
      groupLeaderContact: (row['leader_contact'] ?? row['Leader Contact'] ?? row['groupLeaderContact'] ?? '').trim(),
      capacity: parseInt(row['capacity'] ?? row['Capacity'] ?? '45', 10) || 45,
    })).filter((r) => r.busNumber)
  }

  function handleImport() {
    startTransition(async () => {
      const res = await bulkImportBuses(eventId, rows)
      setResult(res); setRows([]); setPreview([])
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  return (
    <div>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">Upload File</h6>
        </div>
        <div className="card-body p-4">
          <p className="small text-muted mb-3">
            CSV or Excel with columns:{' '}
            <code className="bg-light px-1 rounded">bus_number</code>,{' '}
            <code className="bg-light px-1 rounded">bus_name</code>,{' '}
            <code className="bg-light px-1 rounded">leader_name</code>,{' '}
            <code className="bg-light px-1 rounded">leader_contact</code>,{' '}
            <code className="bg-light px-1 rounded">capacity</code>
          </p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="form-control" />
          {error && <div className="alert alert-danger py-2 small mt-2 mb-0">{error}</div>}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
            <h6 className="mb-0 fw-semibold">Preview ({rows.length} rows)</h6>
            <button onClick={handleImport} disabled={isPending} className="btn btn-primary btn-sm">
              {isPending ? <><span className="spinner-border spinner-border-sm me-1" />Importing...</> : `Import ${rows.length} buses`}
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.82rem' }}>
              <thead className="table-light">
                <tr>
                  <th>#</th><th>Bus Name</th><th>Leader</th><th>Contact</th><th>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td className="font-monospace">{r.busNumber}</td>
                    <td>{r.busName}</td>
                    <td>{r.groupLeaderName}</td>
                    <td>{r.groupLeaderContact}</td>
                    <td>{r.capacity}</td>
                  </tr>
                ))}
                {rows.length > 10 && (
                  <tr><td colSpan={5} className="text-center text-muted py-2 small">... and {rows.length - 10} more</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex align-items-center gap-2 mb-3 text-success">
              <span className="fs-4">✓</span>
              <p className="fw-semibold mb-0">{result.imported} buses imported</p>
            </div>
            {result.errors.length > 0 && (
              <div className="mb-3">
                <p className="small fw-semibold text-danger mb-2">{result.errors.length} rows rejected:</p>
                {result.errors.map((e, i) => (
                  <div key={i} className="alert alert-danger py-1 px-3 small mb-1">Row {e.row} (#{e.busNumber}): {e.error}</div>
                ))}
              </div>
            )}
            <Link href={`/admin/buses?eventId=${eventId}`} className="btn btn-primary btn-sm">View Buses</Link>
          </div>
        </div>
      )}
    </div>
  )
}
