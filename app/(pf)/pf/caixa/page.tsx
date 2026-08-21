'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfCaixa } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function mesStr(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function mesLabel(m: string) {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function hoje() {
  return new Date().toISOString().split('T')[0]
}

const CATS_ENTRADA = ['Salário', 'Freelance', 'Aluguel recebido', 'Investimento', 'Pensão', 'Outros']
const CATS_SAIDA   = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinatura', 'Outros']

const ORIGEM_LABEL: Record<string, string> = {
  manual: '', baixa_receita: 'entrada', baixa_despesa: 'despesa',
  aporte_meta: 'meta', pagamento_fatura: 'fatura',
}

export default function CaixaPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(mesStr())
  const [registros, setRegistros] = useState<PfCaixa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida')
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hoje())
  const [cat, setCat] = useState('')

  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const inicio = `${mes}-01`
    const fim    = `${mes}-31`
    const { data: rows } = await supabase
      .from('pf_caixa').select('*')
      .gte('data', inicio).lte('data', fim)
      .order('data', { ascending: false })
    setRegistros((rows as PfCaixa[]) || [])
    setLoading(false)
  }, [mes])

  useEffect(() => { load() }, [load])

  function navMes(d: number) { setMes(prev => { const [y, m] = prev.split('-').map(Number); const next = new Date(y, m - 1 + d); return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}` }) }

  async function salvar() {
    if (!desc || !valor || !data) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pf_caixa').insert({
      user_id: user!.id, tipo, descricao: desc, valor: parseFloat(valor),
      data, categoria: cat || null, origem: 'manual',
    })
    setDesc(''); setValor(''); setCat(''); setData(hoje()); setShowForm(false)
    await load(); setSaving(false)
  }

  function excluir(id: string) {
    setDlg({ msg: 'Excluir este lançamento do caixa?', onOk: async () => { await supabase.from('pf_caixa').delete().eq('id', id); load() } })
  }

  const totalE = registros.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const totalS = registros.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
  const totalM = registros.filter(r => r.tipo === 'meta').reduce((s, r) => s + Number(r.valor), 0)
  const saldo  = totalE - totalS - totalM

  const cats = tipo === 'entrada' ? CATS_ENTRADA : CATS_SAIDA

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>Controle de Caixa</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Movimentações efetivas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>+ Lançar</button>
      </div>

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 16px' }}>
        <button onClick={() => navMes(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 20, lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', textTransform: 'capitalize' }}>{mesLabel(mes)}</span>
        <button onClick={() => navMes(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 20, lineHeight: 1 }}>›</button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Entradas', val: totalE, color: 'var(--emerald)' },
          { label: 'Saídas',   val: totalS, color: 'var(--rose)' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{c.label}</p>
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: c.color }} className="tabular">{fmt(c.val)}</p>
          </div>
        ))}
      </div>
      {totalM > 0 && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(232,168,12,.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Aportes em metas</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }} className="tabular">{fmt(totalM)}</span>
        </div>
      )}
      <div style={{ background: saldo >= 0 ? 'rgba(13,153,101,.08)' : 'var(--rose-dim)', border: `1px solid ${saldo >= 0 ? 'rgba(13,153,101,.2)' : 'rgba(224,48,85,.2)'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: saldo >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>Saldo do período</span>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: saldo >= 0 ? 'var(--emerald)' : 'var(--rose)' }} className="tabular">{fmt(saldo)}</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : registros.length === 0 ? (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>💳</p>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>Nenhum lançamento neste mês.</p>
          <p style={{ color: 'var(--t3)', fontSize: 12, marginTop: 4 }}>Use "Lançar" para registrar ou baixe entradas/despesas fixas.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
          {registros.map((r, i) => {
            const entrada = r.tipo === 'entrada'
            const meta    = r.tipo === 'meta'
            const cor     = entrada ? 'var(--emerald)' : meta ? 'var(--accent)' : 'var(--rose)'
            const origemTag = ORIGEM_LABEL[r.origem]
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < registros.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: entrada ? 'rgba(13,153,101,.1)' : meta ? 'var(--accent-dim)' : 'var(--rose-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {entrada ? <path d="M8 12V4M5 7l3-3 3 3" stroke={cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/> : meta ? <circle cx="8" cy="8" r="5" stroke={cor} strokeWidth="1.6"/> : <path d="M8 4v8M5 9l3 3 3-3" stroke={cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>}
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</p>
                    {origemTag && <span style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--s2)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 5, flexShrink: 0 }}>{origemTag}</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>{r.categoria || '—'} · {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: cor, flexShrink: 0 }} className="tabular">
                  {entrada ? '+' : '-'}{fmt(Number(r.valor))}
                </span>
                {r.origem === 'manual' && (
                  <button onClick={() => excluir(r.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>🗑</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: novo lançamento */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowForm(false)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>Novo lançamento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* tipo */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(['entrada', 'saida'] as const).map(t => (
                  <button key={t} type="button" onClick={() => { setTipo(t); setCat('') }}
                    style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === t ? (t === 'entrada' ? 'var(--emerald)' : 'var(--rose)') : 'var(--border)'}`, background: tipo === t ? (t === 'entrada' ? 'rgba(13,153,101,.08)' : 'var(--rose-dim)') : 'var(--s2)', color: tipo === t ? (t === 'entrada' ? 'var(--emerald)' : 'var(--rose)') : 'var(--t2)' }}>
                    {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </button>
                ))}
              </div>
              <div><label>Descrição</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Mercado, Salário…" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Valor (R$)</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
                <div style={{ flex: 1 }}><label>Data</label><input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
              </div>
              <div><label>Categoria</label>
                <select value={cat} onChange={e => setCat(e.target.value)}>
                  <option value="">— Selecione —</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvar} disabled={saving || !desc || !valor} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Lançar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dlg && (
        <ConfirmModal message={dlg.msg} confirmLabel="Excluir" onConfirm={() => { dlg.onOk(); setDlg(null) }} onCancel={() => setDlg(null)} />
      )}
    </div>
  )
}
