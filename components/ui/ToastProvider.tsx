'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastContainer({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      {items.map(item => (
        <div
          key={item.id}
          className="px-4 py-3 rounded-xl text-sm shadow-lg border"
          style={{
            background:
              item.type === 'success'
                ? 'rgba(16, 185, 129, 0.18)'
                : item.type === 'error'
                ? 'rgba(239, 68, 68, 0.18)'
                : 'rgba(59, 130, 246, 0.18)',
            borderColor:
              item.type === 'success'
                ? 'rgba(16, 185, 129, 0.4)'
                : item.type === 'error'
                ? 'rgba(239, 68, 68, 0.4)'
                : 'rgba(59, 130, 246, 0.4)',
            color:
              item.type === 'success'
                ? '#6ee7b7'
                : item.type === 'error'
                ? '#fecaca'
                : '#bfdbfe',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex-1">{item.message}</span>
            <button
              onClick={() => onDismiss(item.id)}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setItems(prev => [...prev, { id, type, message }])
    setTimeout(() => dismiss(id), 3500)
  }, [dismiss])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
