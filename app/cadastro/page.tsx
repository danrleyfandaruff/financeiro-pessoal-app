'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    })
    if (error) {
      setErro(error.message === 'User already registered'
        ? 'Este email já está cadastrado.'
        : 'Erro ao criar conta. Tente novamente.')
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh' }}
      className="flex flex-col items-center justify-center px-5 py-12">

      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <svg width="52" height="42" viewBox="0 0 52 42" fill="none" aria-hidden="true">
          <rect x="0" y="18" width="14" height="24" rx="3" fill="var(--accent)"/>
          <rect x="19" y="8" width="14" height="34" rx="3" fill="var(--accent)"/>
          <rect x="38" y="0" width="14" height="42" rx="3" fill="var(--t1)"/>
        </svg>
        <div className="text-center">
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
            Controle Financeiro
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
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres" minLength={6} required autoComplete="new-password" />
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
