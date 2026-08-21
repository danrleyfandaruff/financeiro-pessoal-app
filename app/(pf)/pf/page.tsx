'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { PfCaixa, PfReceita, PfDespesa } from '@/lib/types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function mesStr(offset = 0) {
  const d = new Date(); d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function mesLabel(m: string) {
  const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function PFHomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [mes, setMes] = useState(mesStr())
  const [caixa, setCaixa] = useState<PfCaixa[]>([])
  const [pendReceit, setPendReceit] = useState<PfReceita[]>([])
  const [pendDesp, setPendDesp] = useState<PfDespesa[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', user.id).single()
    if (perfil) setNome(perfil.nome?.split(' ')[0] || '')

    const inicio = `${mes}-01`, fim = `${mes}-31`
    const [cx, rr, dd] = await Promise.all([
      supabase.from('pf_caixa').select('*').gte('data', inicio).lte('data', fim),
      supabase.from('pf_receitas').select('*').eq('status', 'pendente'),
      supabase.from('pf_despesas').select('*').eq('status', 'pendente'),
    ])
    setCaixa((cx.data as PfCaixa[]) || [])
    setPendReceit((rr.data as PfReceita[]) || [])
    setPendDesp((dd.data as PfDespesa[]) || [])
    setLoading(false)
  }, [mes])

  useEffect(() => { load() }, [load])

  function navMes(d: number) {
    setMes(prev => {
      const [y, m] = prev.split('-').map(Number)
      const next = new Date(y, m - 1 + d)
      return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    })
  }

  const entradas   = caixa.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const saidas     = caixa.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
  const metas      = caixa.filter(r => r.tipo === 'meta').reduce((s, r) => s + Number(r.valor), 0)
  const resultado  = entradas - saidas - metas

  // por categoria
  const porCat = caixa.reduce<Record<string, { e: number; s: number }>>((acc, r) => {
    const k = r.categoria || 'Outros'
    if (!acc[k]) acc[k] = { e: 0, s: 0 }
    if (r.tipo === 'entrada') acc[k].e += Number(r.valor)
    else acc[k].s += Number(r.valor)
    return acc
  }, {})

  const totalPrevReceit = pendReceit.reduce((s, r) => s + Number(r.valor), 0)
  const totalPrevDesp   = pendDesp.reduce((s, d) => s + Number(d.valor || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Saudação */}
      {nome && (
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>
            Olá, {nome}!
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>Resumo financeiro</p>
        </div>
      )}

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 16px' }}>
        <button onClick={() => navMes(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 20, lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', textTransform: 'capitalize' }}>{mesLabel(mes)}</span>
        <button onClick={() => navMes(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 20, lineHeight: 1 }}>›</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : (
        <>
          {/* Cards principais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Entradas', val: entradas, color: 'var(--emerald)', bg: 'rgba(13,153,101,.06)', border: 'rgba(13,153,101,.2)' },
              { label: 'Saídas',   val: saidas,   color: 'var(--rose)',    bg: 'var(--rose-dim)',      border: 'rgba(224,48,85,.2)' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: '14px 16px' }}>
                <p style={{ fontSize: 11, color: c.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{c.label}</p>
                <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 19, fontWeight: 800, color: c.color }} className="tabular">{fmt(c.val)}</p>
              </div>
            ))}
          </div>

          {metas > 0 && (
            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(232,168,12,.2)', borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Aportes em metas</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--accent)' }} className="tabular">{fmt(metas)}</span>
            </div>
          )}

          {/* Resultado */}
          <div style={{ background: '#0F1629', borderRadius: 18, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Resultado do período</p>
              <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 800, color: resultado >= 0 ? '#E8A80C' : '#E03055' }} className="tabular">{fmt(resultado)}</p>
            </div>
            <Link href="/pf/caixa" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver caixa
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>

          {/* Por categoria */}
          {Object.keys(porCat).length > 0 && (
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Por categoria</p>
              {Object.entries(porCat)
                .sort((a, b) => (b[1].e + b[1].s) - (a[1].e + a[1].s))
                .slice(0, 6)
                .map(([cat, vals]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--t1)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      {vals.e > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--emerald)' }} className="tabular">+{fmt(vals.e)}</span>}
                      {vals.s > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rose)' }} className="tabular">-{fmt(vals.s)}</span>}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Pendências */}
          {(pendReceit.length > 0 || pendDesp.length > 0) && (
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Pendências</p>
              {pendReceit.length > 0 && (
                <Link href="/pf/receitas" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>Entradas a receber</p>
                    <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{pendReceit.length} item{pendReceit.length !== 1 ? 's' : ''} pendente{pendReceit.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--emerald)' }} className="tabular">{fmt(totalPrevReceit)}</p>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--t3)', marginTop: 2 }}><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </Link>
              )}
              {pendReceit.length > 0 && pendDesp.length > 0 && <div style={{ height: 1, background: 'var(--border)' }} />}
              {pendDesp.length > 0 && (
                <Link href="/pf/despesas" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>Despesas a pagar</p>
                    <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{pendDesp.length} item{pendDesp.length !== 1 ? 's' : ''} pendente{pendDesp.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--rose)' }} className="tabular">{fmt(totalPrevDesp)}</p>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--t3)', marginTop: 2 }}><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </Link>
              )}
            </div>
          )}

          {caixa.length === 0 && pendReceit.length === 0 && pendDesp.length === 0 && (
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>📊</p>
              <p style={{ color: 'var(--t2)', fontSize: 14 }}>Nenhuma movimentação neste período.</p>
              <p style={{ color: 'var(--t3)', fontSize: 12, marginTop: 4 }}>Cadastre entradas ou despesas, ou lance diretamente no caixa.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
