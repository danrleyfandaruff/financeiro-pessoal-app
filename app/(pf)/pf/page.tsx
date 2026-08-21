'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { PfReceita, PfDespesa, PfCartao, PfLancamentoCartao, PfMeta } from '@/lib/types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function diasRestantesNoMes() {
  const hoje = new Date()
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  return fim.getDate() - hoje.getDate() + 1
}

function mesAtualLabel() {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function PFHomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [receitas, setReceitas] = useState<PfReceita[]>([])
  const [despesas, setDespesas] = useState<PfDespesa[]>([])
  const [cartoes, setCartoes] = useState<PfCartao[]>([])
  const [lancamentos, setLancamentos] = useState<PfLancamentoCartao[]>([])
  const [metas, setMetas] = useState<PfMeta[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', user.id).single()
    if (perfil) setNome(perfil.nome?.split(' ')[0] || '')

    const hoje = new Date()
    const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

    const [r, d, c, l, m] = await Promise.all([
      supabase.from('pf_receitas').select('*').eq('ativa', true),
      supabase.from('pf_despesas').select('*').eq('ativa', true),
      supabase.from('pf_cartoes').select('*'),
      supabase.from('pf_lancamentos_cartao').select('*').gte('data', `${mesStr}-01`).lte('data', `${mesStr}-31`),
      supabase.from('pf_metas').select('*').order('criado_em'),
    ])
    setReceitas((r.data as PfReceita[]) || [])
    setDespesas((d.data as PfDespesa[]) || [])
    setCartoes((c.data as PfCartao[]) || [])
    setLancamentos((l.data as PfLancamentoCartao[]) || [])
    setMetas((m.data as PfMeta[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalReceitas = receitas.reduce((s, r) => s + Number(r.valor), 0)
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0)
  const faturaTotal = lancamentos.reduce((s, l) => s + Number(l.valor), 0)
  const saldoDisponivel = totalReceitas - totalDespesas - faturaTotal
  const diasRestantes = diasRestantesNoMes()
  const gastoDiario = saldoDisponivel > 0 ? saldoDisponivel / diasRestantes : 0

  const metasAtivas = metas.filter(m => m.valor_atual < m.valor_meta)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Saudação */}
      {nome && (
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>
            Olá, {nome}! 👋
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>{mesAtualLabel()}</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : (
        <>
          {/* Indicador de gasto diário — destaque principal */}
          <div style={{
            background: gastoDiario > 0 ? 'linear-gradient(135deg, #0F1629 0%, #1a2540 100%)' : 'var(--rose-dim)',
            borderRadius: 22,
            padding: '24px 24px 20px',
            color: gastoDiario > 0 ? '#fff' : 'var(--t1)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {gastoDiario > 0 && (
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(232,168,12,.12)' }} />
            )}
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .7, marginBottom: 6 }}>
              Pode gastar por dia
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 38, fontWeight: 800, color: gastoDiario > 0 ? '#E8A80C' : 'var(--rose)', lineHeight: 1 }}>
                {fmt(gastoDiario)}
              </span>
            </div>
            <p style={{ fontSize: 12, opacity: .6, marginTop: 6 }}>
              {diasRestantes} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'} no mês
              {saldoDisponivel <= 0 && ' · Atenção: despesas excedem receitas'}
            </p>
          </div>

          {/* Cards resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link href="/pf/receitas" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(13,153,101,.2)', borderRadius: 16, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--emerald)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Receitas fixas</p>
                <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--emerald)' }} className="tabular">{fmt(totalReceitas)}</p>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{receitas.length} {receitas.length === 1 ? 'item' : 'itens'}</p>
              </div>
            </Link>
            <Link href="/pf/despesas" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--rose-dim)', border: '1px solid rgba(224,48,85,.2)', borderRadius: 16, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--rose)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Despesas fixas</p>
                <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--rose)' }} className="tabular">{fmt(totalDespesas)}</p>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{despesas.length} {despesas.length === 1 ? 'item' : 'itens'}</p>
              </div>
            </Link>
            <Link href="/pf/cartao" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Fatura do mês</p>
                <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)' }} className="tabular">{fmt(faturaTotal)}</p>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{cartoes.length} {cartoes.length === 1 ? 'cartão' : 'cartões'}</p>
              </div>
            </Link>
            <Link href="/pf/metas" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(232,168,12,.2)', borderRadius: 16, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Metas ativas</p>
                <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>{metasAtivas.length}</p>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>de {metas.length} total</p>
              </div>
            </Link>
          </div>

          {/* Metas em progresso */}
          {metasAtivas.length > 0 && (
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Progresso das metas</span>
              </div>
              {metasAtivas.slice(0, 3).map(m => {
                const pct = Math.min(100, (m.valor_atual / m.valor_meta) * 100)
                return (
                  <div key={m.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{m.nome}</span>
                      <span style={{ fontSize: 13, color: 'var(--t2)' }} className="tabular">{fmt(m.valor_atual)} / {fmt(m.valor_meta)}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: m.cor || 'var(--accent)', borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{pct.toFixed(0)}% concluído</p>
                  </div>
                )
              })}
              {metasAtivas.length > 3 && (
                <Link href="/pf/metas" style={{ display: 'block', padding: '12px 18px', fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                  Ver todas as metas →
                </Link>
              )}
            </div>
          )}

          {/* Estado vazio */}
          {receitas.length === 0 && despesas.length === 0 && (
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>Configure sua conta pessoal</p>
              <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>Adicione suas receitas e despesas fixas para calcular quanto você pode gastar por dia.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Link href="/pf/receitas" className="btn-primary" style={{ fontSize: 13, padding: '10px 16px' }}>+ Receita</Link>
                <Link href="/pf/despesas" style={{ fontSize: 13, padding: '10px 16px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--t1)', textDecoration: 'none', fontWeight: 500 }}>+ Despesa</Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
