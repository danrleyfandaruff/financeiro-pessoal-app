'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtData, primeiroDiaMes, ultimoDiaMes, hoje, FORMAS_PAGAMENTO } from '@/lib/utils'
import type { Caixa } from '@/lib/types'
import Modal from '@/components/shared/Modal'
import ConfirmModal from '@/components/ConfirmModal'

type Filtro = 'todos' | 'entrada' | 'saida'

export default function LancamentosPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<Caixa[]>([])
  const [loading, setLoading] = useState(true)
  const [inicio, setInicio] = useState(primeiroDiaMes())
  const [fim, setFim] = useState(ultimoDiaMes())
  const [filtroTipo, setFiltroTipo] = useState<Filtro>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Caixa | null>(null)
  const [categorias, setCategorias] = useState<string[]>([])
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  const [fTipo, setFTipo] = useState<'entrada' | 'saida'>('saida')
  const [fDesc, setFDesc] = useState('')
  const [fValor, setFValor] = useState('')
  const [fData, setFData] = useState(hoje())
  const [fCategoria, setFCategoria] = useState('')
  const [fForma, setFForma] = useState('PIX')
  const [fObs, setFObs] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('caixa').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }).order('criado_em', { ascending: false })
    const { data } = filtroTipo !== 'todos' ? await q.eq('tipo', filtroTipo) : await q
    setRegistros((data as Caixa[]) || [])
    const { data: cats } = await supabase.from('categorias').select('nome').order('nome')
    setCategorias((cats || []).map((c: { nome: string }) => c.nome))
    setLoading(false)
  }, [inicio, fim, filtroTipo])

  useEffect(() => { load() }, [load])

  function abrirForm(item?: Caixa) {
    if (item) {
      setEditItem(item); setFTipo(item.tipo); setFDesc(item.descricao)
      setFValor(String(item.valor)); setFData(item.data); setFCategoria(item.categoria || '')
      setFForma(item.forma_pagamento || 'PIX'); setFObs(item.observacoes || '')
    } else {
      setEditItem(null); setFTipo('saida'); setFDesc(''); setFValor('')
      setFData(hoje()); setFCategoria(''); setFForma('PIX'); setFObs('')
    }
    setShowForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      tipo: fTipo, descricao: fDesc.trim(),
      valor: parseFloat(fValor.replace(',', '.')),
      data: fData, categoria: fCategoria || null,
      forma_pagamento: fForma || null, observacoes: fObs.trim() || null, origem: 'manual' as const,
    }
    if (editItem) {
      await supabase.from('caixa').update(payload).eq('id', editItem.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('caixa').insert({ ...payload, user_id: user!.id })
    }
    setSaving(false); setShowForm(false); load()
  }

  function excluir(id: string) {
    setDlg({
      msg: 'Tem certeza que deseja excluir este lançamento?',
      onOk: async () => {
        await supabase.from('caixa').delete().eq('id', id)
        load()
      },
    })
  }

  const totalE = registros.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const totalS = registros.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)

  const comSaldo = [...registros].reverse().reduce<(Caixa & { saldo: number })[]>((acc, r) => {
    const prev = acc.at(-1)?.saldo ?? 0
    return [...acc, { ...r, saldo: prev + (r.tipo === 'entrada' ? Number(r.valor) : -Number(r.valor)) }]
  }, []).reverse()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showForm && (
        <Modal title={editItem ? 'Editar lançamento' : 'Novo lançamento'} onClose={() => setShowForm(false)}>
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Tipo toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['entrada','saida'] as const).map(t => (
                <button key={t} type="button" onClick={() => setFTipo(t)}
                  style={{
                    padding: '10px 0',
                    borderRadius: 12,
                    border: `1.5px solid ${fTipo === t ? (t === 'entrada' ? 'var(--emerald)' : 'var(--rose)') : 'var(--border)'}`,
                    background: fTipo === t ? (t === 'entrada' ? 'var(--emerald-dim)' : 'var(--rose-dim)') : 'var(--s2)',
                    color: fTipo === t ? (t === 'entrada' ? 'var(--emerald)' : 'var(--rose)') : 'var(--t2)',
                    fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all .15s',
                  }}>
                  {t === 'entrada' ? '↓ Entrada' : '↑ Saída'}
                </button>
              ))}
            </div>
            <div><label>Descrição</label><input value={fDesc} onChange={e => setFDesc(e.target.value)} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label>Valor (R$)</label><input inputMode="decimal" value={fValor} onChange={e => setFValor(e.target.value)} required /></div>
              <div><label>Data</label><input type="date" value={fData} onChange={e => setFData(e.target.value)} required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>Categoria</label>
                <select value={fCategoria} onChange={e => setFCategoria(e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label>Forma</label>
                <select value={fForma} onChange={e => setFForma(e.target.value)}>
                  {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div><label>Observações</label><input value={fObs} onChange={e => setFObs(e.target.value)} /></div>
            <button type="submit" disabled={saving} className="btn-primary" style={{ height: 48 }}>
              {saving ? 'Salvando…' : editItem ? 'Salvar alterações' : 'Adicionar lançamento'}
            </button>
          </form>
        </Modal>
      )}

      {/* Filtros — linha 1: chips + botão novo */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }} className="scrollbar-hide">
          {(['todos','entrada','saida'] as Filtro[]).map(f => (
            <button key={f} onClick={() => setFiltroTipo(f)} className={`chip${filtroTipo === f ? ' active' : ''}`}>
              {f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
        <button onClick={() => abrirForm()} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>
          + Novo
        </button>
      </div>
      {/* Filtros — linha 2: datas */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={{ fontSize: 13, padding: '7px 10px', flex: 1 }} />
        <span style={{ color: 'var(--t3)', flexShrink: 0 }}>→</span>
        <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={{ fontSize: 13, padding: '7px 10px', flex: 1 }} />
      </div>

      {/* Totais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Entradas', val: totalE, cor: 'var(--emerald)' },
          { label: 'Saídas',   val: totalS, cor: 'var(--rose)' },
          { label: 'Saldo',    val: totalE - totalS, cor: totalE - totalS >= 0 ? 'var(--emerald)' : 'var(--rose)' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.cor }} className="tabular">{fmt(c.val)}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Data','Descrição','Categoria','Forma','Valor','Saldo',''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--t3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '10px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comSaldo.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)', fontSize: 14 }}>Nenhum lançamento</td></tr>
                ) : comSaldo.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < comSaldo.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{fmtData(r.data)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: 'var(--t1)' }}>{r.descricao}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--t2)' }}>{r.categoria || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--t3)' }}>{r.forma_pagamento || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: r.tipo === 'entrada' ? 'var(--emerald)' : 'var(--rose)' }} className="tabular">
                      {r.tipo === 'entrada' ? '+' : '-'}{fmt(Number(r.valor))}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, whiteSpace: 'nowrap', color: r.saldo >= 0 ? 'var(--t1)' : 'var(--rose)' }} className="tabular">{fmt(r.saldo)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => abrirForm(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--t2)', fontSize: 16 }}>✏️</button>
                        <button onClick={() => excluir(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--t2)', fontSize: 16 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {dlg && (
        <ConfirmModal
          message={dlg.msg}
          confirmLabel="Excluir"
          onConfirm={() => { dlg.onOk(); setDlg(null) }}
          onCancel={() => setDlg(null)}
        />
      )}
    </div>
  )
}
