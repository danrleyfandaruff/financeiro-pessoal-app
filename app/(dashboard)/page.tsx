'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtData, primeiroDiaMes, ultimoDiaMes, hoje, menosNMeses } from '@/lib/utils'
import type { Caixa, ContaPagar, ContaReceber, EvolucaoMensal } from '@/lib/types'
import GraficoMensal from '@/components/resumo/GraficoMensal'
import GraficoPizza from '@/components/resumo/GraficoPizza'
import Link from 'next/link'

type Periodo = 'hoje' | 'mes' | 'todos'

const quickActions = [
  { href: '/lancamentos',  emoji: '📋', label: 'Caixa' },
  { href: '/a-receber',    emoji: '⬇️',  label: 'Receber' },
  { href: '/a-pagar',      emoji: '⬆️',  label: 'Pagar' },
  { href: '/resultado',    emoji: '📊',  label: 'Resultado' },
  { href: '/conferencia',  emoji: '🔍',  label: 'Conf.' },
  { href: '/recorrencias', emoji: '🗓️',  label: 'Parcelas' },
  { href: '/patrimonio',   emoji: '🏢',  label: 'Patrimônio' },
  { href: '/categorias',   emoji: '🏷️',  label: 'Categorias' },
]

export default function ResumoPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [inicio, setInicio] = useState(primeiroDiaMes())
  const [fim, setFim] = useState(ultimoDiaMes())
  const [caixa, setCaixa] = useState<Caixa[]>([])
  const [recentes, setRecentes] = useState<Caixa[]>([])
  const [aReceber, setAReceber] = useState(0)
  const [aPagar, setAPagar] = useState(0)
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  function aplicarPeriodo(p: Periodo) {
    setPeriodo(p)
    if (p === 'hoje')  { setInicio(hoje()); setFim(hoje()) }
    if (p === 'mes')   { setInicio(primeiroDiaMes()); setFim(ultimoDiaMes()) }
    if (p === 'todos') { setInicio('2000-01-01'); setFim('2099-12-31') }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [cx, rec, pag, ev] = await Promise.all([
      supabase.from('caixa').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
      supabase.from('contas_receber').select('valor').eq('pago', false),
      supabase.from('contas_pagar').select('valor').eq('pago', false),
      supabase.from('caixa').select('*').gte('data', menosNMeses(5)).order('data'),
    ])
    const cxData = (cx.data as Caixa[]) || []
    setCaixa(cxData)
    setRecentes(cxData.slice(0, 8))
    setAReceber(((rec.data || []) as { valor: number }[]).reduce((s, r) => s + Number(r.valor), 0))
    setAPagar(((pag.data || []) as { valor: number }[]).reduce((s, p) => s + Number(p.valor), 0))

    const byMes: Record<string, EvolucaoMensal> = {}
    ;((ev.data as Caixa[]) || []).forEach(r => {
      const mes = r.data.slice(0, 7)
      if (!byMes[mes]) byMes[mes] = { mes, entradas: 0, saidas: 0, saldo: 0 }
      if (r.tipo === 'entrada') byMes[mes].entradas += Number(r.valor)
      else byMes[mes].saidas += Number(r.valor)
      byMes[mes].saldo = byMes[mes].entradas - byMes[mes].saidas
    })
    setEvolucao(Object.values(byMes).sort((a, b) => a.mes.localeCompare(b.mes)))
    setLoading(false)
  }, [inicio, fim])

  useEffect(() => { load() }, [load])

  const totalEntradas = caixa.filter(c => c.tipo === 'entrada').reduce((s, c) => s + Number(c.valor), 0)
  const totalSaidas   = caixa.filter(c => c.tipo === 'saida').reduce((s, c) => s + Number(c.valor), 0)
  const saldo = totalEntradas - totalSaidas

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filtro de período ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="scrollbar-hide">
          {(['hoje','mes','todos'] as Periodo[]).map(p => (
            <button key={p} onClick={() => aplicarPeriodo(p)}
              className={`chip${periodo === p ? ' active' : ''}`}>
              {p === 'hoje' ? 'Hoje' : p === 'mes' ? 'Este mês' : 'Todos'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={inicio} onChange={e => { setInicio(e.target.value); setPeriodo('todos') }}
            style={{ width: 'auto', fontSize: 13, padding: '7px 10px' }} />
          <span style={{ color: 'var(--t3)' }}>→</span>
          <input type="date" value={fim} onChange={e => { setFim(e.target.value); setPeriodo('todos') }}
            style={{ width: 'auto', fontSize: 13, padding: '7px 10px' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : (<>

        {/* ── Hero: Saldo ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--s2) 0%, var(--s3) 100%)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: '24px 22px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* decorative ring */}
          <div style={{
            position: 'absolute', right: -24, top: -24,
            width: 120, height: 120, borderRadius: '50%',
            border: '1.5px solid var(--border-2)',
            opacity: .5,
          }} />
          <div style={{
            position: 'absolute', right: -48, top: -48,
            width: 180, height: 180, borderRadius: '50%',
            border: '1.5px solid var(--border)',
            opacity: .3,
          }} />

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Saldo em caixa
          </div>
          <div style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 36,
            fontWeight: 800,
            color: saldo < 0 ? 'var(--rose)' : 'var(--emerald)',
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: '-.02em',
          }} className="tabular">
            {fmt(saldo)}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 3 }}>Entradas</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--emerald)' }} className="tabular">
                {fmt(totalEntradas)}
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 3 }}>Saídas</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--rose)' }} className="tabular">
                {fmt(totalSaidas)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pendências ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link href="/a-receber" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--emerald-dim)',
              border: '1px solid rgba(52,211,153,.2)',
              borderRadius: 16,
              padding: '14px 16px',
              transition: 'border-color .15s',
            }}>
              <div style={{ fontSize: 12, color: 'var(--emerald)', marginBottom: 6, fontWeight: 500 }}>
                ↓ A Receber
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--emerald)' }} className="tabular">
                {fmt(aReceber)}
              </div>
            </div>
          </Link>
          <Link href="/a-pagar" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--rose-dim)',
              border: '1px solid rgba(251,113,133,.2)',
              borderRadius: 16,
              padding: '14px 16px',
              transition: 'border-color .15s',
            }}>
              <div style={{ fontSize: 12, color: 'var(--rose)', marginBottom: 6, fontWeight: 500 }}>
                ↑ A Pagar
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--rose)' }} className="tabular">
                {fmt(aPagar)}
              </div>
            </div>
          </Link>
        </div>

        {/* ── Ações rápidas ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Acesso rápido
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {quickActions.map(a => (
              <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--s1)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '12px 6px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'border-color .15s',
                  cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 22 }}>{a.emoji}</span>
                  <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 500 }}>{a.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Gráfico mensal ── */}
        <GraficoMensal data={evolucao} />

        {/* ── Gráficos de pizza ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <GraficoPizza gastos={caixa} tipo="entrada" title="Receitas por categoria" />
          <GraficoPizza gastos={caixa} tipo="saida"   title="Despesas por categoria" />
        </div>

        {/* ── Lançamentos recentes ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Lançamentos recentes
          </div>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
            {recentes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)', fontSize: 14 }}>
                Nenhum lançamento no período
              </div>
            ) : recentes.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: i < recentes.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700,
                  background: r.tipo === 'entrada' ? 'var(--emerald-dim)' : 'var(--rose-dim)',
                  color: r.tipo === 'entrada' ? 'var(--emerald)' : 'var(--rose)',
                  flexShrink: 0,
                }}>
                  {r.tipo === 'entrada' ? '↓' : '↑'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.descricao}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                    {fmtData(r.data)}{r.categoria ? ` · ${r.categoria}` : ''}
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                  color: r.tipo === 'entrada' ? 'var(--emerald)' : 'var(--rose)',
                }} className="tabular">
                  {r.tipo === 'entrada' ? '+' : '-'}{fmt(Number(r.valor))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </>)}
    </div>
  )
}
