'use client'

import { useState, useTransition, useRef } from 'react'
import Papa from 'papaparse'
import { bulkImportPassengers, type ImportRow, type ImportResult } from '@/lib/actions/passengers'
import type { Bus } from '@/lib/db/schema'
import Link from 'next/link'

interface Props {
  eventId: string
  buses: Bus[]
}

export function ImportForm({ eventId, buses }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)

    if (file.name.endsWith('.csv')) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const parsed = parseRows(res.data)
          setRows(parsed)
          setPreview(parsed.slice(0, 10))
        },
      })
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const buf = await file.arrayBuffer()
      await wb.xlsx.load(buf)
      const ws = wb.worksheets[0]
      const headers: string[] = []
      const data: Record<string, string>[] = []
      ws.eachRow((row, ri) => {
        if (ri === 1) { row.eachCell((cell) => headers.push(String(cell.value ?? ''))) }
        else {
          const obj: Record<string, string> = {}
          row.eachCell({ includeEmpty: true }, (cell, ci) => { obj[headers[ci - 1]] = String(cell.value ?? '') })
          data.push(obj)
        }
      })
      const parsed = parseRows(data)
      setRows(parsed)
      setPreview(parsed.slice(0, 10))
    } else {
      setError('Please upload a CSV or Excel file.')
    }
  }

  function parseRows(data: Record<string, string>[]): ImportRow[] {
    return data.map((row) => {
      const refId = row['ref_id'] ?? row['RefID'] ?? row['Ref ID'] ?? row['id'] ?? ''
      const name = row['name'] ?? row['Name'] ?? row['full_name'] ?? ''
      const gender = row['gender'] ?? row['Gender'] ?? ''
      const ageStr = row['age'] ?? row['Age'] ?? ''
      const busNum = row['bus_number'] ?? row['Bus Number'] ?? row['bus'] ?? ''
      return {
        refId: refId.trim(),
        name: name.trim(),
        gender: gender.trim() || undefined,
        age: ageStr ? parseInt(ageStr, 10) || null : null,
        assignedBusNumber: busNum.trim() || undefined,
      }
    }).filter((r) => r.refId || r.name)
  }

  function handleImport() {
    startTransition(async () => {
      const res = await bulkImportPassengers(eventId, rows)
      setResult(res)
      setRows([])
      setPreview([])
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
            <code className="bg-light px-1 rounded">ref_id</code>,{' '}
            <code className="bg-light px-1 rounded">name</code>,{' '}
            <code className="bg-light px-1 rounded">gender</code> (optional),{' '}
            <code className="bg-light px-1 rounded">age</code> (optional),{' '}
            <code className="bg-light px-1 rounded">bus_number</code> (optional)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            className="form-control"
          />
          {error && <div className="alert alert-danger py-2 small mt-2 mb-0">{error}</div>}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
            <h6 className="mb-0 fw-semibold">Preview ({rows.length} rows)</h6>
            <button onClick={handleImport} disabled={isPending} className="btn btn-primary btn-sm">
              {isPending ? <><span className="spinner-border spinner-border-sm me-1" />Importing...</> : `Import ${rows.length} rows`}
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.82rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Ref ID</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Bus #</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td className="font-monospace">{r.refId}</td>
                    <td>{r.name}</td>
                    <td className="text-muted">{r.gender ?? '—'}</td>
                    <td className="text-muted">{r.age ?? '—'}</td>
                    <td className="text-muted">{r.assignedBusNumber ?? '—'}</td>
                  </tr>
                ))}
                {rows.length > 10 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-2 small">
                      ... and {rows.length - 10} more rows
                    </td>
                  </tr>
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
              <p className="fw-semibold mb-0">{result.imported} passengers imported successfully</p>
            </div>
            {result.errors.length > 0 && (
              <div className="mb-3">
                <p className="small fw-semibold text-danger mb-2">{result.errors.length} rows rejected:</p>
                <div className="d-flex flex-column gap-1">
                  {result.errors.map((e, i) => (
                    <div key={i} className="alert alert-danger py-1 px-3 small mb-0">
                      Row {e.row} (ref: {e.refId || '—'}): {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Link href={`/admin/passengers?eventId=${eventId}`} className="btn btn-primary btn-sm">
              View Passengers
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
