'use client'

import { useState, useTransition, useRef } from 'react'
import Papa from 'papaparse'
import { bulkImportPassengers, type ImportRow, type ImportResult } from '@/lib/actions/passengers'
import type { Bus } from '@/lib/db/schema'

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
        if (ri === 1) {
          row.eachCell((cell) => headers.push(String(cell.value ?? '')))
        } else {
          const obj: Record<string, string> = {}
          row.eachCell({ includeEmpty: true }, (cell, ci) => {
            obj[headers[ci - 1]] = String(cell.value ?? '')
          })
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
    <div className="space-y-4">
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-3">Upload File</h3>
        <p className="text-sm text-gray-500 mb-4">
          CSV or Excel with columns: <code className="bg-black/10 px-1 rounded">ref_id</code>, <code className="bg-black/10 px-1 rounded">name</code>, <code className="bg-black/10 px-1 rounded">gender</code> (optional), <code className="bg-black/10 px-1 rounded">age</code> (optional), <code className="bg-black/10 px-1 rounded">bus_number</code> (optional)
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFile}
          className="glass-input px-4 py-3 text-sm w-full"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {preview.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/20 flex items-center justify-between">
            <h3 className="font-semibold">Preview ({rows.length} rows)</h3>
            <button onClick={handleImport} disabled={isPending} className="btn-primary px-5 py-2 text-sm">
              {isPending ? 'Importing…' : `Import ${rows.length} rows`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-3 text-left font-medium text-gray-500">Ref ID</th>
                  <th className="p-3 text-left font-medium text-gray-500">Name</th>
                  <th className="p-3 text-left font-medium text-gray-500">Gender</th>
                  <th className="p-3 text-left font-medium text-gray-500">Age</th>
                  <th className="p-3 text-left font-medium text-gray-500">Bus #</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="p-3 font-mono text-xs">{r.refId}</td>
                    <td className="p-3">{r.name}</td>
                    <td className="p-3 text-gray-500">{r.gender ?? '—'}</td>
                    <td className="p-3 text-gray-500">{r.age ?? '—'}</td>
                    <td className="p-3 text-gray-500">{r.assignedBusNumber ?? '—'}</td>
                  </tr>
                ))}
                {rows.length > 10 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-gray-500 text-xs">
                      … and {rows.length - 10} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="text-xl">✓</span>
            <p className="font-semibold">{result.imported} passengers imported successfully</p>
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-500 mb-2">{result.errors.length} rows rejected:</p>
              <div className="space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-3 py-1">
                    Row {e.row} (ref: {e.refId || '—'}): {e.error}
                  </p>
                ))}
              </div>
            </div>
          )}
          <a href={`/admin/passengers?eventId=${eventId}`} className="btn-primary px-5 py-2 text-sm inline-block mt-2">
            View Passengers
          </a>
        </div>
      )}
    </div>
  )
}
