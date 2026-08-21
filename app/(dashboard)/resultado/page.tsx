'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, primeiroDiaMes, ultimoDiaMes } from '@/lib/utils'
import type { Caixa } from '@/lib/types'

export default function ResultadoPage() {
  const supabase = createClient()
  const [inicio, setInicio] = useState(primeiroDiaMes())
  const [fim, setFim] = useState(ultimoDiaMes())
  const [caixa, setCaixa] = useState<Caixa[]>([])
  const [loading, setLoading] = useState(true)

  const apurar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('caixa').select('*').gte('data', inicio).lte('data', fim)
    setCaixa((data as Caixa[]) || [])
    setLoading(false)
  }, [inicio, fim])

  useEffect(() => { apurar() }, [apurar])

  const receitas = caixa.filter(c => c.tipo === 'entrada')
  const despesas = caixa.filter(c => c.tipo === 'saida')
  const totalR   = receitas.reduce((s, c) => s + Number(c.valor), 0)
  const totalD   = despesas.reduce((s, c) => s + Number(c.valor), 0)
  const resultado = totalR - totalD
  const margem   = totalR > 0 ? ((resultado / totalR) * 100).toFixed(1) : null

  const porCategoria = (list: Caixa[]) => {
    const map: Record<string, number> = {}
    list.forEach(c => { const k = c.categoria || 'Sem categoria'; map[k] = (map[k] || 0) + Number(c.valor) })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Filtro de período */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
          style={{ fontSize: 13, padding: '7px 10px', flex: 1 }} />
        <span style={{ color: 'var(--t3)', flexShrink: 0 }}>→</span>
        <input type="date" value={fim} onChange={e => setFim(e.target.value)}
          style={{ fontSize: 13, padding: '7px 10px', flex: 1 }} />
        <button onClick={apurar} disabled={loading} className="btn-primary"
          style={{ padding: '9px 14px', fontSize: 13, flexShrink: 0 }}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>Calculando…</div>
      ) : (
        <>
          {/* Receitas */}
          <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,22,41,.04)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'var(--emerald-dim)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 14 }}>↓ Receitas brutas</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--emerald)' }} className="tabular">
                {fmt(totalR)}
              </span>
            </div>
            {porCategoria(receitas).map(([cat, val]) => (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 18px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 14, color: 'var(--t2)' }}>{cat}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }} className="tabular">{fmt(val)}</span>
              </div>
            ))}
            {receitas.length === 0 && (
              <div style={{ padding: '12px 18px', fontSize: 13, color: 'var(--t3)' }}>Nenhuma receita no período</div>
            )}
          </div>

          {/* Despesas */}
          <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,22,41,.04)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'var(--rose-dim)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 14 }}>↑ Despesas</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--rose)' }} className="tabular">
                ({fmt(totalD)})
              </span>
            </div>
            {porCategoria(despesas).map(([cat, val]) => (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 18px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 14, color: 'var(--t2)' }}>{cat}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }} className="tabular">({fmt(val)})</span>
              </div>
            ))}
            {despesas.length === 0 && (
              <div style={{ padding: '12px 18px', fontSize: 13, color: 'var(--t3)' }}>Nenhuma despesa no período</div>
            )}
          </div>

          {/* Resultado */}
          <div style={{
            background: resultado >= 0 ? 'var(--emerald-dim)' : 'var(--rose-dim)',
            border: `1px solid ${resultado >= 0 ? 'rgba(13,153,101,.2)' : 'rgba(224,48,85,.2)'}`,
            borderRadius: 18,
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: margem ? 8 : 0 }}>
              <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 15 }}>Resultado do período</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: resultado >= 0 ? 'var(--emerald)' : 'var(--rose)' }} className="tabular">
                {fmt(resultado)}
              </span>
            </div>
            {margem && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>Margem sobre receita</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: resultado >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                  {margem}%
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
