'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  nome?: string | null
  email?: string | null
  contaAtiva?: 'PJ' | 'PF'
  tipoUsuario?: 'PJ' | 'PF' | 'AMBOS'
}

export default function Navbar({ nome, email, contaAtiva, tipoUsuario }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    document.cookie = 'conta-ativa=;path=/;max-age=0'
    router.push('/login')
    router.refresh()
  }

  function handleBadgeClick() {
    if (tipoUsuario === 'AMBOS') {
      document.cookie = 'conta-ativa=;path=/;max-age=0'
      router.push('/selecionar-conta')
    } else {
      router.push('/perfil')
    }
  }

  const badgeLabel = tipoUsuario === 'AMBOS'
    ? (contaAtiva ?? 'PJ')
    : (tipoUsuario ?? contaAtiva ?? 'PJ')

  const badgeTitle = tipoUsuario === 'AMBOS'
    ? 'Trocar conta'
    : 'Gerenciar contas'

  const isPF = badgeLabel === 'PF'

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

      {/* Left: user info + badge conta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Ícone de perfil (sempre visível, mobile e desktop) */}
        <button onClick={() => router.push('/perfil')} title="Perfil"
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--s2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="5.5" r="2.5" stroke="var(--t2)" strokeWidth="1.4"/>
            <path d="M2.5 13c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="var(--t2)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Nome + email (só desktop) */}
        <button onClick={() => router.push('/perfil')} className="hidden sm:flex flex-col leading-none gap-0.5"
          style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          <span style={{ color: 'var(--t1)', fontWeight: 600, fontSize: 13 }}>{nome || 'Usuário'}</span>
          {email && <span style={{ color: 'var(--t3)', fontSize: 11 }}>{email}</span>}
        </button>

        {/* Badge de conta — sempre visível */}
        <button onClick={handleBadgeClick} title={badgeTitle}
          style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
            background: isPF ? 'rgba(99,102,241,.12)' : 'var(--accent-dim)',
            color: isPF ? '#6366f1' : 'var(--accent)',
            border: `1px solid ${isPF ? 'rgba(99,102,241,.25)' : 'rgba(232,168,12,.3)'}`,
            cursor: 'pointer', flexShrink: 0,
          }}>
          {badgeLabel}
          {tipoUsuario !== 'AMBOS' && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
              style={{ marginLeft: 4, verticalAlign: 'middle', opacity: .7 }}>
              <path d="M2 3.5L5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Center: logo */}
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
        <button onClick={logout} title="Sair"
          style={{
            background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)',
            borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
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
