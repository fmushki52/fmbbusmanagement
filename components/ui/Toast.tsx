'use client'
import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export interface ToastMessage { id: string; type: ToastType; message: string }

let listeners: ((t: ToastMessage) => void)[] = []
export function showToast(message: string, type: ToastType = 'info') {
  const toast = { id: Math.random().toString(36).slice(2), type, message }
  listeners.forEach(fn => fn(toast))
}

const bsClass: Record<ToastType, string> = {
  success: 'text-bg-success',
  error: 'text-bg-danger',
  warning: 'text-bg-warning',
  info: 'text-bg-primary',
}
const icons: Record<ToastType, string> = {
  success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  useEffect(() => { const t = setTimeout(onRemove, 4000); return () => clearTimeout(t) }, [onRemove])
  return (
    <div className={`toast show align-items-center border-0 ${bsClass[toast.type]}`} role="alert">
      <div className="d-flex">
        <div className="toast-body d-flex align-items-center gap-2">
          <span>{icons[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
        <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={onRemove} />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  useEffect(() => {
    const fn = (t: ToastMessage) => setToasts(prev => [...prev, t])
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
  }, [])
  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast}
          onRemove={() => setToasts(t => t.filter(x => x.id !== toast.id))} />
      ))}
    </div>
  )
}
