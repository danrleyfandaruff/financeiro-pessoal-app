'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Email ou senha incorretos.')
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
          <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 4 }}>Acesse sua conta</p>
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
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required autoComplete="email" />
          </div>
          <div>
            <label>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2"
            style={{ height: 50 }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>

      <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 24 }}>
        Não tem conta?{' '}
        <Link href="/cadastro" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
