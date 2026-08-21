'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TipoConta } from '@/lib/types'

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const [temPJ, setTemPJ] = useState(true)
  const [temPF, setTemPF] = useState(false)
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setNome(user.user_metadata?.nome || '')
      supabase.from('perfis').select('nome,tipo_conta').eq('id', user.id).single()
        .then(({ data }) => {
          const tc: TipoConta = (data?.tipo_conta ?? user.user_metadata?.tipo_conta ?? 'PJ') as TipoConta
          setTemPJ(tc === 'PJ' || tc === 'AMBOS')
          setTemPF(tc === 'PF' || tc === 'AMBOS')
          if (data?.nome) setNome(data.nome)
          setLoading(false)
        })
    })
  }, [])

  function tipoConta(): TipoConta {
    if (temPJ && temPF) return 'AMBOS'
    if (temPF) return 'PF'
    return 'PJ'
  }

  async function salvar() {
    if (!temPJ && !temPF) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tc = tipoConta()
    await Promise.all([
      supabase.from('perfis').upsert({ id: user.id, nome, tipo_conta: tc }),
      supabase.auth.updateUser({ data: { nome, tipo_conta: tc } }),
    ])
    setOk(true)
    document.cookie = 'conta-ativa=;path=/;max-age=0'
    setTimeout(() => router.push('/selecionar-conta'), 1200)
    setSaving(false)
  }

  if (loading) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Voltar
        </button>

        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>Perfil e contas</h1>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>Altere seu nome e quais módulos você usa.</p>

        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </div>

          <div>
            <label style={{ marginBottom: 10, display: 'block' }}>Tipo de conta ativa</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { key: 'PJ', label: 'Empresa (PJ)', desc: 'Caixa, contas a pagar/receber', checked: temPJ, set: setTemPJ },
                { key: 'PF', label: 'Pessoal (PF)', desc: 'Salário, cartão, metas', checked: temPF, set: setTemPF },
              ].map(({ key, label, desc, checked, set }) => (
                <button key={key} type="button" onClick={() => set(!checked)}
                  style={{
                    flex: 1, padding: '12px 10px', borderRadius: 14, textAlign: 'left',
                    border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent-dim)' : 'var(--s2)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: checked ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#07090f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--t1)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--t3)', paddingLeft: 22 }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {ok ? (
            <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(13,153,101,.2)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--emerald)', fontWeight: 600, textAlign: 'center' }}>
              Salvo! Redirecionando…
            </div>
          ) : (
            <button onClick={salvar} disabled={saving || (!temPJ && !temPF)} className="btn-primary" style={{ height: 50, fontSize: 14 }}>
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
