'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { href: '/pf',          label: 'Início',   icon: <HomeIcon /> },
  { href: '/pf/receitas', label: 'Receitas', icon: <ReceitaIcon /> },
  { href: '/pf/despesas', label: 'Despesas', icon: <DespesaIcon /> },
  { href: '/pf/cartao',   label: 'Cartão',   icon: <CartaoIcon /> },
  { href: '/pf/metas',    label: 'Metas',    icon: <MetaIcon /> },
]

export function NavTabsPFDesktop() {
  const path = usePathname()
  const isActive = (href: string) => href === '/pf' ? path === '/pf' : path.startsWith(href)
  return (
    <div className="hidden md:block" style={{ borderBottom: '1px solid var(--border)', background: 'var(--s1)' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 16px', display: 'flex' }}>
        {tabs.map(t => {
          const active = isActive(t.href)
          return (
            <Link key={t.href} href={t.href}
              style={{
                padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'var(--t2)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color .15s',
              }}>
              {t.icon}{t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function NavTabsPFMobile() {
  const path = usePathname()
  const router = useRouter()
  const isActive = (href: string) => href === '/pf' ? path === '/pf' : path.startsWith(href)

  function trocarConta() {
    document.cookie = 'conta-ativa=;path=/;max-age=0'
    router.push('/selecionar-conta')
  }

  return (
    <nav className="md:hidden"
      style={{ background: 'var(--s1)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {tabs.map(t => {
          const active = isActive(t.href)
          return (
            <Link key={t.href} href={t.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '10px 4px 8px', minHeight: 56, justifyContent: 'center',
                color: active ? 'var(--accent)' : 'var(--t3)',
                textDecoration: 'none', transition: 'color .15s',
              }}>
              <div style={{ color: active ? 'var(--accent)' : 'var(--t2)' }}>{t.icon}</div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 20v-7h6v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function ReceitaIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M11 15V7M8 9l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function DespesaIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M11 7v8M8 13l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function CartaoIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h16" stroke="currentColor" strokeWidth="1.6"/><path d="M7 14h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
}
function MetaIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/><circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
}
