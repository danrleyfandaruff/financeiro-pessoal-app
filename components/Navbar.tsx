'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  nome?: string | null
  email?: string | null
}

export default function Navbar({ nome, email }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      style={{
        background: 'var(--s1)',
        borderBottom: '1px solid var(--border)',
        height: 56,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 16px',
      }}
      className="sticky top-0 z-30">

      {/* Left: user info (desktop only) */}
      <div className="hidden sm:flex flex-col leading-none gap-0.5">
        <span style={{ color: 'var(--t1)', fontWeight: 600, fontSize: 13 }}>{nome || 'Usuário'}</span>
        {email && <span style={{ color: 'var(--t3)', fontSize: 11 }}>{email}</span>}
      </div>
      <div className="sm:hidden" />

      {/* Center: logo — truly centered in the header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
          <rect x="0"  y="13" width="5" height="5"  rx="1.2" fill="var(--t3)"/>
          <rect x="6"  y="8"  width="5" height="10" rx="1.2" fill="var(--accent)"/>
          <rect x="12" y="3"  width="5" height="15" rx="1.2" fill="var(--accent)"/>
          <rect x="18" y="0"  width="6" height="18" rx="1.2" fill="var(--t1)"/>
          <polyline points="2.5,13 8.5,8 14.5,3 21,0" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5"/>
        </svg>
        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}
          className="hidden sm:block">
          Restarta<span style={{ color: 'var(--accent)' }}> Finance</span>
        </span>
      </div>

      {/* Right: logout */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={logout}
          title="Sair"
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            color: 'var(--t2)',
            borderRadius: 10,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9.5 1.5H12a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H9.5M5.5 4.5 8.5 7 5.5 9.5M8.5 7H1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
