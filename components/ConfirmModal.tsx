'use client'

interface ConfirmModalProps {
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  message,
  confirmLabel = 'Confirmar',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '28px 24px',
          width: '100%', maxWidth: 340,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: danger ? 'rgba(251,113,133,.12)' : 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {danger ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 6v4M9 12.5h.01M2.5 15.5h13a1 1 0 0 0 .87-1.5l-6.5-11a1 1 0 0 0-1.74 0l-6.5 11a1 1 0 0 0 .87 1.5z"
                    stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="var(--accent)" strokeWidth="1.5"/>
                  <path d="M9 8v5M9 6h.01" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Confirmar ação</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--t2)', margin: 0, lineHeight: 1.55, paddingLeft: 46 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '13px',
              border: '1px solid var(--border)', background: 'var(--s2)',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', color: 'var(--t2)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '13px', border: 'none',
              borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              background: danger ? 'var(--rose)' : 'var(--accent)',
              color: danger ? '#fff' : '#07090f',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
