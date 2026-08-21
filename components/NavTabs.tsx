'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const primary = [
  { href: '/',             label: 'Início',    icon: <HomeIcon /> },
  { href: '/lancamentos',  label: 'Caixa',     icon: <CaixaIcon /> },
  { href: '/a-pagar',      label: 'A Pagar',   icon: <PagarIcon /> },
  { href: '/a-receber',    label: 'Receber',   icon: <ReceberIcon /> },
]

const secondary = [
  { href: '/resultado',    label: 'Resultado',   icon: '📊' },
  { href: '/conferencia',  label: 'Conferência', icon: '🔍' },
  { href: '/recorrencias', label: 'Parcelas',    icon: '🗓️' },
  { href: '/patrimonio',   label: 'Patrimônio',  icon: '🏢' },
  { href: '/categorias',   label: 'Categorias',  icon: '🏷️' },
]

const all = [
  { href: '/',             label: 'Resumo',      icon: '🏠' },
  { href: '/lancamentos',  label: 'Livro Caixa', icon: '📋' },
  { href: '/a-receber',    label: 'A Receber',   icon: '⬇️' },
  { href: '/a-pagar',      label: 'A Pagar',     icon: '⬆️' },
  { href: '/resultado',    label: 'Resultado',   icon: '📊' },
  { href: '/conferencia',  label: 'Conferência', icon: '🔍' },
  { href: '/recorrencias', label: 'Parcelas',    icon: '🗓️' },
  { href: '/patrimonio',   label: 'Patrimônio',  icon: '🏢' },
  { href: '/categorias',   label: 'Categorias',  icon: '🏷️' },
]

function useIsActive() {
  const path = usePathname()
  return (href: string) => href === '/' ? path === '/' : path.startsWith(href)
}

/* ── Desktop: horizontal tabs — rendered BEFORE <main> ── */
export function NavTabsDesktop() {
  const isActive = useIsActive()
  return (
    <div className="hidden md:block" style={{ borderBottom: '1px solid var(--border)', background: 'var(--s1)' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', overflowX: 'auto' }} className="scrollbar-hide">
          {all.map(t => {
            const active = isActive(t.href)
            return (
              <Link key={t.href} href={t.href}
                style={{
                  padding: '12px 18px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--t2)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'color .15s', textDecoration: 'none',
                }}>
                <span>{t.icon}</span>{t.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Mobile: bottom bar — rendered AFTER <main> so fica no fundo ── */
export function NavTabsMobile() {
  const isActive = useIsActive()
  const [showMore, setShowMore] = useState(false)
  const inSecondary = secondary.some(t => isActive(t.href))

  return (
    <>
      <nav className="md:hidden"
        style={{
          background: 'var(--s1)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          flexShrink: 0,
        }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {primary.map(t => {
            const active = isActive(t.href)
            return (
              <Link key={t.href} href={t.href}
                onClick={() => setShowMore(false)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '10px 4px 8px',
                  color: active ? 'var(--accent)' : 'var(--t3)',
                  textDecoration: 'none', transition: 'color .15s',
                  minHeight: 56, justifyContent: 'center',
                }}>
                <div style={{ color: active ? 'var(--accent)' : 'var(--t2)', transition: 'color .15s' }}>
                  {t.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '.01em' }}>
                  {t.label}
                </span>
              </Link>
            )
          })}

          <button onClick={() => setShowMore(v => !v)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '10px 4px 8px',
              color: (showMore || inSecondary) ? 'var(--accent)' : 'var(--t3)',
              background: 'none', border: 'none', cursor: 'pointer',
              minHeight: 56, justifyContent: 'center',
            }}>
            <MoreIcon active={showMore || inSecondary} />
            <span style={{
              fontSize: 10, fontWeight: (showMore || inSecondary) ? 600 : 400,
              color: (showMore || inSecondary) ? 'var(--accent)' : 'var(--t3)',
            }}>Mais</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <>
          <div className="md:hidden"
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.35)' }}
            onClick={() => setShowMore(false)} />
          <div className="md:hidden"
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 41,
              background: 'var(--s1)',
              borderTop: '1px solid var(--border)',
              borderRadius: '20px 20px 0 0',
              padding: '16px 20px 80px',
            }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 18px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {secondary.map(t => {
                const active = isActive(t.href)
                return (
                  <Link key={t.href} href={t.href}
                    onClick={() => setShowMore(false)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '14px 8px', borderRadius: 14,
                      background: active ? 'var(--accent-dim)' : 'var(--s2)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      color: active ? 'var(--accent)' : 'var(--t1)',
                      textDecoration: 'none', fontSize: 12, fontWeight: 500, textAlign: 'center' as const,
                      transition: 'all .15s',
                    }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    {t.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ── Icons ─────────────────────────────────────────────────── */

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8 20v-7h6v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CaixaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M3 10h16" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 4h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M7 14h3M15 14h.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function PagarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M11 7v8M8 13l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ReceberIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M11 15V7M8 9l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="6" cy="11" r="1.5" fill={active ? 'var(--accent)' : 'var(--t2)'}/>
      <circle cx="11" cy="11" r="1.5" fill={active ? 'var(--accent)' : 'var(--t2)'}/>
      <circle cx="16" cy="11" r="1.5" fill={active ? 'var(--accent)' : 'var(--t2)'}/>
    </svg>
  )
}
