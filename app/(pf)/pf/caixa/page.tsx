'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfCaixa, PfBanco } from '@/lib/types'
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
function hoje() { return new Date().toISOString().split('T')[0] }

const CATS_ENTRADA = ['Salário', 'Freelance', 'Aluguel recebido', 'Investimento', 'Pensão', 'Outros']
const CATS_SAIDA   = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinatura', 'Outros']
const ORIGEM_LABEL: Record<string, string> = {
  manual: '', baixa_receita: 'entrada', baixa_despesa: 'despesa',
  aporte_meta: 'meta', pagamento_fatura: 'fatura',
}

const CORES_BANCO = ['#0F1629', '#E8A80C', '#0D9965', '#E03055', '#7C3AED', '#2563EB', '#EA580C']

export default function CaixaPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(mesStr())
  const [registros, setRegistros] = useState<PfCaixa[]>([])
  const [bancos, setBancos] = useState<PfBanco[]>([])
  const [saldosBanco, setSaldosBanco] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBancoForm, setShowBancoForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  // Lançamento form
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida')
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hoje())
  const [cat, setCat] = useState('')
  const [bancoId, setBancoId] = useState('')

  // Banco form
  const [bNome, setBNome] = useState('')
  const [bSaldo, setBSaldo] = useState('')
  const [bCor, setBCor] = useState(CORES_BANCO[0])

  const load = useCallback(async () => {
    setLoading(true)
    const inicio = `${mes}-01`
    const fim    = `${mes}-31`
    const [rows, bancoRows, allCaixa] = await Promise.all([
      supabase.from('pf_caixa').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
      supabase.from('pf_bancos').select('*').order('nome'),
      supabase.from('pf_caixa').select('banco_id, tipo, valor').not('banco_id', 'is', null),
    ])
    setRegistros((rows.data as PfCaixa[]) || [])
    const bList = (bancoRows.data as PfBanco[]) || []
    setBancos(bList)

    // Calcular saldo acumulado de cada banco (all-time)
    const saldos: Record<string, number> = {}
    bList.forEach(b => { saldos[b.id] = Number(b.saldo_inicial) })
    ;(allCaixa.data || []).forEach((r: { banco_id: string; tipo: string; valor: number }) => {
      if (!saldos[r.banco_id]) saldos[r.banco_id] = 0
      if (r.tipo === 'entrada') saldos[r.banco_id] += Number(r.valor)
      else saldos[r.banco_id] -= Number(r.valor)
    })
    setSaldosBanco(saldos)
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

  async function salvar() {
    if (!desc || !valor || !data) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pf_caixa').insert({
      user_id: user!.id, tipo, descricao: desc, valor: parseFloat(valor),
      data, categoria: cat || null, origem: 'manual', banco_id: bancoId || null,
    })
    setDesc(''); setValor(''); setCat(''); setData(hoje()); setBancoId(''); setShowForm(false)
    await load(); setSaving(false)
  }

  async function salvarBanco() {
    if (!bNome) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pf_bancos').insert({
      user_id: user!.id, nome: bNome,
      saldo_inicial: parseFloat(bSaldo || '0'),
      cor: bCor,
    })
    setBNome(''); setBSaldo(''); setBCor(CORES_BANCO[0])
    setShowBancoForm(false); setSaving(false); load()
  }

  function excluir(id: string) {
    setDlg({ msg: 'Excluir este lançamento do caixa?', onOk: async () => { await supabase.from('pf_caixa').delete().eq('id', id); load() } })
  }

  function excluirBanco(b: PfBanco) {
    setDlg({
      msg: `Excluir o banco "${b.nome}"? Os lançamentos no caixa vinculados a ele não serão excluídos, apenas o vínculo será removido.`,
      onOk: async () => { await supabase.from('pf_bancos').delete().eq('id', b.id); load() },
    })
  }

  const totalE = registros.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const totalS = registros.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
  const totalM = registros.filter(r => r.tipo === 'meta').reduce((s, r) => s + Number(r.valor), 0)
  const saldo  = totalE - totalS - totalM
  const cats   = tipo === 'entrada' ? CATS_ENTRADA : CATS_SAIDA

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

      {/* Bancos */}
      {bancos.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Bancos</p>
            <button onClick={() => setShowBancoForm(true)} style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>+ Adicionar</button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {bancos.map(b => {
              const saldo = saldosBanco[b.id] ?? Number(b.saldo_inicial)
              return (
                <div key={b.id}
                  style={{ minWidth: 130, borderRadius: 16, padding: '14px 16px', background: b.cor || '#0F1629', flexShrink: 0, position: 'relative' }}>
                  <button onClick={() => excluirBanco(b)}
                    style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 8, fontWeight: 600, paddingRight: 24 }}>{b.nome}</p>
                  <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: saldo >= 0 ? '#fff' : '#ff6b7a' }} className="tabular">{fmt(saldo)}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>saldo atual</p>
                </div>
              )
            })}
            <button onClick={() => setShowBancoForm(true)}
              style={{ minWidth: 90, borderRadius: 16, padding: '14px 16px', border: '2px dashed var(--border)', background: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13, flexShrink: 0 }}>
              + Banco
            </button>
          </div>
        </div>
      )}

      {bancos.length === 0 && (
        <button onClick={() => setShowBancoForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'var(--s1)', border: '1px dashed var(--border)', borderRadius: 16, cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🏦</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Adicionar banco</p>
            <p style={{ fontSize: 11, color: 'var(--t3)' }}>Controle o saldo por conta bancária</p>
          </div>
        </button>
      )}

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 16px' }}>
        <button onClick={() => navMes(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 20, lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', textTransform: 'capitalize' }}>{mesLabel(mes)}</span>
        <button onClick={() => navMes(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 20, lineHeight: 1 }}>›</button>
      </div>

      {/* Resumo mensal */}
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
            const entrada  = r.tipo === 'entrada'
            const meta     = r.tipo === 'meta'
            const cor      = entrada ? 'var(--emerald)' : meta ? 'var(--accent)' : 'var(--rose)'
            const origemTag = ORIGEM_LABEL[r.origem]
            const banco    = bancos.find(b => b.id === r.banco_id)
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < registros.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: entrada ? 'rgba(13,153,101,.1)' : meta ? 'var(--accent-dim)' : 'var(--rose-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {entrada ? <path d="M8 12V4M5 7l3-3 3 3" stroke={cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/> : meta ? <circle cx="8" cy="8" r="5" stroke={cor} strokeWidth="1.6"/> : <path d="M8 4v8M5 9l3 3 3-3" stroke={cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>}
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</p>
                    {origemTag && <span style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--s2)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 5, flexShrink: 0 }}>{origemTag}</span>}
                    {banco && <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: banco.cor || '#0F1629', padding: '1px 6px', borderRadius: 5, flexShrink: 0 }}>{banco.nome}</span>}
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
              {bancos.length > 0 && (
                <div>
                  <label style={{ marginBottom: 8, display: 'block' }}>Banco (opcional)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button type="button" onClick={() => setBancoId('')}
                      style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `2px solid ${!bancoId ? 'var(--accent)' : 'var(--border)'}`, background: !bancoId ? 'var(--accent-dim)' : 'var(--s2)', color: !bancoId ? 'var(--accent)' : 'var(--t2)' }}>
                      Geral
                    </button>
                    {bancos.map(b => (
                      <button key={b.id} type="button" onClick={() => setBancoId(b.id)}
                        style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `2px solid ${bancoId === b.id ? (b.cor || 'var(--accent)') : 'var(--border)'}`, background: bancoId === b.id ? `${b.cor || 'var(--accent)'}22` : 'var(--s2)', color: bancoId === b.id ? (b.cor || 'var(--accent)') : 'var(--t2)' }}>
                        {b.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvar} disabled={saving || !desc || !valor} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Lançar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: novo banco */}
      {showBancoForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowBancoForm(false)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>Adicionar banco / conta</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Nome</label><input value={bNome} onChange={e => setBNome(e.target.value)} placeholder="Nubank, Itaú, Caixa…" /></div>
                <div style={{ flex: 1 }}><label>Saldo inicial (R$)</label><input type="number" value={bSaldo} onChange={e => setBSaldo(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
              </div>
              <div>
                <label style={{ marginBottom: 8, display: 'block' }}>Cor</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CORES_BANCO.map(cor => (
                    <button key={cor} type="button" onClick={() => setBCor(cor)}
                      style={{ width: 32, height: 32, borderRadius: 10, background: cor, border: bCor === cor ? '3px solid var(--t1)' : '2px solid transparent', cursor: 'pointer', outline: bCor === cor ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
              {/* Preview do card */}
              <div style={{ borderRadius: 14, padding: '14px 16px', background: bCor }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 8, fontWeight: 600 }}>{bNome || 'Nome do banco'}</p>
                <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: '#fff' }} className="tabular">{fmt(parseFloat(bSaldo || '0'))}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>saldo inicial</p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowBancoForm(false)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvarBanco} disabled={saving || !bNome} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Adicionar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dlg && (
        <ConfirmModal message={dlg.msg} confirmLabel="Confirmar" onConfirm={() => { dlg.onOk(); setDlg(null) }} onCancel={() => setDlg(null)} />
      )}
    </div>
  )
}
