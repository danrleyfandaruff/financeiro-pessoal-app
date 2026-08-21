'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { TipoConta } from '@/lib/types'

const SENHA_REGRAS = [
  { id: 'len',     label: 'Mínimo 8 caracteres',       ok: (s: string) => s.length >= 8 },
  { id: 'upper',   label: 'Letra maiúscula (A-Z)',      ok: (s: string) => /[A-Z]/.test(s) },
  { id: 'lower',   label: 'Letra minúscula (a-z)',      ok: (s: string) => /[a-z]/.test(s) },
  { id: 'number',  label: 'Número (0-9)',               ok: (s: string) => /[0-9]/.test(s) },
  { id: 'special', label: 'Caractere especial (!@#…)',  ok: (s: string) => /[^A-Za-z0-9]/.test(s) },
]

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenhaHint, setShowSenhaHint] = useState(false)
  const [temPJ, setTemPJ] = useState(true)
  const [temPF, setTemPF] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  function tipoConta(): TipoConta {
    if (temPJ && temPF) return 'AMBOS'
    if (temPF) return 'PF'
    return 'PJ'
  }

  const senhaValida = SENHA_REGRAS.every(r => r.ok(senha))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!temPJ && !temPF) { setErro('Selecione ao menos um tipo de conta.'); return }
    if (!senhaValida) { setErro('A senha não atende aos requisitos mínimos de segurança.'); setShowSenhaHint(true); return }
    setLoading(true)
    const supabase = createClient()
    const tc = tipoConta()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, tipo_conta: tc } },
    })
    if (error) {
      setErro(error.message === 'User already registered'
        ? 'Este email já está cadastrado.'
        : 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }
    if (data.user) {
      // fallback: o trigger cria o perfil automaticamente, mas fazemos upsert como garantia
      await supabase.from('perfis').upsert({ id: data.user.id, nome, tipo_conta: tc })
    }
    router.push('/')
    router.refresh()
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh' }}
      className="flex flex-col items-center justify-center px-5 py-12">

      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <svg width="56" height="42" viewBox="0 0 56 42" fill="none" aria-hidden="true">
          <rect x="0"  y="30" width="12" height="12" rx="3" fill="var(--t3)"/>
          <rect x="15" y="18" width="12" height="24" rx="3" fill="var(--accent)"/>
          <rect x="30" y="8"  width="12" height="34" rx="3" fill="var(--accent)"/>
          <rect x="45" y="0"  width="11" height="42" rx="3" fill="var(--t1)"/>
          <polyline points="6,30 21,18 36,8 50.5,0" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45"/>
        </svg>
        <div className="text-center">
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
            Restarta<span style={{ color: 'var(--accent)' }}> Finance</span>
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 4 }}>Crie sua conta gratuita</p>
        </div>
      </div>

      {/* Card form */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--s1)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        padding: 28,
      }}>
        {erro && (
          <div style={{
            background: 'rgba(251,113,133,.1)',
            border: '1px solid rgba(251,113,133,.3)',
            color: 'var(--rose)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 14,
            marginBottom: 18,
          }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label>Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Seu nome" required autoComplete="name" />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required autoComplete="email" />
          </div>
          <div>
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onFocus={() => setShowSenhaHint(true)}
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
            />
            {showSenhaHint && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {SENHA_REGRAS.map(r => {
                  const ok = r.ok(senha)
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? 'rgba(13,153,101,.15)' : 'var(--s2)', border: `1px solid ${ok ? 'rgba(13,153,101,.4)' : 'var(--border)'}`, transition: 'all .15s' }}>
                        {ok && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.2 2.2L8 3" stroke="var(--emerald)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize: 12, color: ok ? 'var(--emerald)' : 'var(--t3)', transition: 'color .15s' }}>{r.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tipo de conta */}
          <div>
            <label style={{ marginBottom: 10, display: 'block' }}>Tipo de conta</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ key: 'PJ', label: 'Empresa (PJ)', desc: 'Caixa, contas a pagar/receber', checked: temPJ, set: setTemPJ },
                { key: 'PF', label: 'Pessoal (PF)', desc: 'Salário, cartão, metas', checked: temPF, set: setTemPF }
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
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2"
            style={{ height: 50 }}>
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>
      </div>

      <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 24 }}>
        Já tem conta?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          Entrar
        </Link>
      </p>
    </div>
  )
}
