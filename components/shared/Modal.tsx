'use client'
import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({ title, onClose, children, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const maxW = { sm: '440px', md: '520px', lg: '640px' }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ padding: '0 0 0 0' }}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.75)' }} onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full overflow-y-auto"
        style={{
          maxWidth: maxW,
          maxHeight: '90svh',
          background: 'var(--s1)',
          border: '1px solid var(--border)',
          borderRadius: '22px 22px 0 0',
        }}
        // On sm+ screens: make it a centered dialog
        // (handled via sm: override below)
      >
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-2)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--s1)' }}>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--t1)' }}>
            {title}
          </h3>
          <button onClick={onClose}
            style={{
              width: 34, height: 34,
              borderRadius: 10,
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              color: 'var(--t2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 20, lineHeight: 1,
            }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 pb-safe">
          {children}
        </div>
      </div>

      {/* On sm+ screens, center it and add rounded bottom corners */}
      <style>{`
        @media (min-width: 640px) {
          .fixed.z-50 > div:last-child {
            border-radius: 22px !important;
            margin: 16px;
          }
        }
      `}</style>
    </div>
  )
}
