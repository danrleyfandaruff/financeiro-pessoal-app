'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TipoConta } from '@/lib/types'

export default function OnboardingPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [temPJ, setTemPJ] = useState(true)
  const [temPF, setTemPF] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initDone, setInitDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      // Pré-preenche o nome com os dados do Google
      const googleName = user.user_metadata?.['full_name'] ?? user.user_metadata?.['name'] ?? ''
      setNome(googleName)
      setInitDone(true)
    })
  }, [router])

  function tipoConta(): TipoConta {
    if (temPJ && temPF) return 'AMBOS'
    if (temPF) return 'PF'
    return 'PJ'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!temPJ && !temPF) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const tc = tipoConta()
    await supabase.from('perfis').upsert({ id: user.id, nome: nome.trim(), tipo_conta: tc })

    // Redireciona para seleção de conta (que lida com PJ/PF/AMBOS) ou direto se só tiver um
    if (tc === 'AMBOS') router.replace('/selecionar-conta')
    else if (tc === 'PF') router.replace('/pf')
    else router.replace('/')
  }

  if (!initDone) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh' }}
      className="flex flex-col items-center justify-center px-5 py-12">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <svg width="48" height="36" viewBox="0 0 56 42" fill="none" aria-hidden="true">
          <rect x="0"  y="30" width="12" height="12" rx="3" fill="var(--t3)"/>
          <rect x="15" y="18" width="12" height="24" rx="3" fill="var(--accent)"/>
          <rect x="30" y="8"  width="12" height="34" rx="3" fill="var(--accent)"/>
          <rect x="45" y="0"  width="11" height="42" rx="3" fill="var(--t1)"/>
          <polyline points="6,30 21,18 36,8 50.5,0" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45"/>
        </svg>
        <div className="text-center">
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
            Bem-vindo!
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 4 }}>
            Configure sua conta para continuar
          </p>
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--s1)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        padding: 28,
      }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Nome */}
          <div>
            <label>Como quer ser chamado?</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
              required
              autoComplete="name"
            />
          </div>

          {/* Tipo de conta */}
          <div>
            <label style={{ marginBottom: 10, display: 'block' }}>
              Que tipo de conta você precisa?
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { key: 'PJ', label: 'Empresa (PJ)', desc: 'Caixa, contas a pagar/receber', checked: temPJ, set: setTemPJ },
                { key: 'PF', label: 'Pessoal (PF)', desc: 'Salário, cartão, metas',       checked: temPF, set: setTemPF },
              ].map(({ key, label, desc, checked, set }) => (
                <button key={key} type="button" onClick={() => set(!checked)}
                  style={{
                    flex: 1, padding: '12px 10px', borderRadius: 14, textAlign: 'left',
                    border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent-dim)' : 'var(--s2)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      background: checked ? 'var(--accent)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#07090f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--t3)', paddingLeft: 22 }}>{desc}</span>
                </button>
              ))}
            </div>
            {!temPJ && !temPF && (
              <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 8 }}>
                Selecione ao menos um tipo de conta.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!temPJ && !temPF)}
            className="btn-primary w-full"
            style={{
              height: 50,
              opacity: loading || (!temPJ && !temPF) ? .6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading && (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"
                style={{ animation: 'spin .7s linear infinite' }}>
                <circle cx="9" cy="9" r="7" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.5"/>
                <path d="M16 9a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </svg>
            )}
            {loading ? 'Salvando…' : 'Entrar no app'}
          </button>
        </form>
      </div>
    </div>
  )
}
