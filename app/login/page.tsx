'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [tentativas, setTentativas] = useState(0)
  const [bloqueadoAte, setBloqueadoAte] = useState(0)

  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (bloqueadoAte === 0) return
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [bloqueadoAte])

  const agora = Date.now()
  const bloqueado = agora < bloqueadoAte
  const restante  = bloqueado ? Math.ceil((bloqueadoAte - agora) / 1000) : 0
  void tick

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bloqueado) return
    setErro('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      const novasTentativas = tentativas + 1
      setTentativas(novasTentativas)
      // cooldown crescente: 3s, 10s, 30s, 60s a partir da 2ª tentativa
      const delays = [0, 3, 10, 30, 60]
      const delay = (delays[Math.min(novasTentativas, delays.length - 1)] || 60) * 1000
      setBloqueadoAte(Date.now() + delay)
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
            {bloqueado && <span style={{ display: 'block', fontSize: 12, marginTop: 4, opacity: .8 }}>Aguarde {restante}s para tentar novamente.</span>}
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
          <button type="submit" disabled={loading || bloqueado} className="btn-primary w-full mt-2"
            style={{ height: 50, opacity: bloqueado ? .5 : 1 }}>
            {loading ? 'Entrando…' : bloqueado ? `Aguarde ${restante}s…` : 'Entrar'}
          </button>
        </form>

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 4px', color: 'var(--t3)', fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span>ou</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Botão Google */}
        <button
          type="button"
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/auth/callback` },
            })
          }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', height: 48, borderRadius: 12, cursor: 'pointer',
            border: '1px solid var(--border)',
            background: 'var(--s2)',
            color: 'var(--t1)', fontSize: 15, fontWeight: 600,
            transition: 'background .15s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--s3)')}
          onMouseOut={e => (e.currentTarget.style.background = 'var(--s2)')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.4 30.2 0 24 0 14.7 0 6.7 5.5 2.7 13.5l7.8 6.1C12.5 13.1 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.5 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.2-3 .6-4.4L2.3 13.5A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.3z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.9 6.1C6.7 42.5 14.7 48 24 48z"/>
          </svg>
          Entrar com Google
        </button>
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
