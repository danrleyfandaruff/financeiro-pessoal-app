'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TipoConta } from '@/lib/types'

export default function SelecionarContaPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [tipoConta, setTipoConta] = useState<TipoConta>('AMBOS')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('perfis').select('nome,tipo_conta').eq('id', user.id).single()
        .then(({ data }) => {
          if (!data) return
          setNome(data.nome || '')
          setTipoConta((data.tipo_conta as TipoConta) || 'PJ')
          if (data.tipo_conta === 'PJ') { router.replace('/'); return }
          if (data.tipo_conta === 'PF') { router.replace('/pf'); return }
          setLoading(false)
        })
    })
  }, [router])

  function entrar(conta: 'PJ' | 'PF') {
    document.cookie = `conta-ativa=${conta};path=/;max-age=86400`
    router.push(conta === 'PJ' ? '/' : '/pf')
  }

  if (loading) return null

  const primeiroNome = nome.split(' ')[0] || 'você'

  const contas = [
    {
      tipo: 'PJ' as const,
      titulo: 'Empresa',
      subtitulo: 'Pessoa Jurídica',
      descricao: 'Caixa, contas a pagar e receber, resultado, patrimônio.',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="10" width="24" height="18" rx="3" stroke="var(--t1)" strokeWidth="1.8"/>
          <path d="M11 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" stroke="var(--t1)" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M4 18h24" stroke="var(--t1)" strokeWidth="1.8"/>
          <rect x="13" y="16" width="6" height="4" rx="1" fill="var(--accent)"/>
        </svg>
      ),
    },
    {
      tipo: 'PF' as const,
      titulo: 'Pessoal',
      subtitulo: 'Pessoa Física',
      descricao: 'Salário, despesas fixas, cartão de crédito, metas e investimentos.',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="10" r="5" stroke="var(--t1)" strokeWidth="1.8"/>
          <path d="M6 26c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="var(--t1)" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M16 19v4M14 21h4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>

      {/* Logo */}
      <svg width="40" height="30" viewBox="0 0 56 42" fill="none" aria-hidden="true" style={{ marginBottom: 24 }}>
        <rect x="0"  y="30" width="12" height="12" rx="3" fill="var(--t3)"/>
        <rect x="15" y="18" width="12" height="24" rx="3" fill="var(--accent)"/>
        <rect x="30" y="8"  width="12" height="34" rx="3" fill="var(--accent)"/>
        <rect x="45" y="0"  width="11" height="42" rx="3" fill="var(--t1)"/>
        <polyline points="6,30 21,18 36,8 50.5,0" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45"/>
      </svg>

      <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--t1)', marginBottom: 6, textAlign: 'center' }}>
        Bem-vindo, <span style={{ color: 'var(--accent)' }}>{primeiroNome}</span>!
      </h1>
      <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: 32, textAlign: 'center' }}>
        Qual conta você quer acessar hoje?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 400 }}>
        {contas.filter(c => tipoConta === 'AMBOS' || c.tipo === tipoConta).map(c => (
          <button key={c.tipo} onClick={() => entrar(c.tipo)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 18,
              padding: '20px 22px',
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'box-shadow .15s, border-color .15s',
              boxShadow: '0 2px 8px rgba(15,22,41,.06)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(232,168,12,.15)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,22,41,.06)'
            }}>
            <div style={{ padding: 10, background: 'var(--s2)', borderRadius: 14, flexShrink: 0 }}>
              {c.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--t1)' }}>{c.titulo}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--s2)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>{c.subtitulo}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>{c.descricao}</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 4 }}>
              <path d="M6 3l6 6-6 6" stroke="var(--t3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
