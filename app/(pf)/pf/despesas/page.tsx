'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfDespesa } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hoje = () => new Date().toISOString().split('T')[0]

const RECORRENCIAS = ['mensal', 'semanal', 'quinzenal', 'anual', 'única']
const CATS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinatura', 'Dívida/Empréstimo', 'Serviços', 'Outros']

export default function DespesasPage() {
  const supabase = createClient()
  const [lista, setLista] = useState<PfDespesa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<PfDespesa | null>(null)
  const [showPagar, setShowPagar] = useState<PfDespesa | null>(null)
  const [saving, setSaving] = useState(false)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  // Form fields
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'fixo' | 'variavel'>('fixo')
  const [valor, setValor] = useState('')
  const [dataPrev, setDataPrev] = useState('')
  const [recorrencia, setRecorrencia] = useState('mensal')
  const [categoria, setCategoria] = useState('')

  // Pagar fields
  const [pagarValor, setPagarValor] = useState('')
  const [pagarData, setPagarData] = useState(hoje())

  const load = useCallback(async () => {
    const { data } = await supabase.from('pf_despesas').select('*').order('data_prevista', { ascending: true })
    setLista((data as PfDespesa[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function abrirForm(item?: PfDespesa) {
    setEditando(item || null)
    setNome(item?.nome || '')
    setTipo(item?.tipo || 'fixo')
    setValor(item?.valor != null ? String(item.valor) : '')
    setDataPrev(item?.data_prevista || '')
    setRecorrencia(item?.recorrencia || 'mensal')
    setCategoria(item?.categoria || '')
    setShowForm(true)
  }

  function abrirPagar(item: PfDespesa) {
    setShowPagar(item)
    setPagarValor(item.tipo === 'fixo' && item.valor != null ? String(item.valor) : '')
    setPagarData(hoje())
  }

  async function salvar() {
    if (!nome) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      nome, tipo, valor: valor ? parseFloat(valor) : null,
      data_prevista: dataPrev || null, recorrencia,
      categoria: categoria || null, ativa: true, status: 'pendente' as const,
    }
    if (editando) {
      await supabase.from('pf_despesas').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('pf_despesas').insert({ ...payload, user_id: user!.id })
    }
    setShowForm(false); setSaving(false); load()
  }

  async function pagar() {
    if (!showPagar || !pagarValor || !pagarData) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await Promise.all([
      supabase.from('pf_despesas').update({ status: 'paga', data_paga: pagarData, valor_pago: parseFloat(pagarValor) }).eq('id', showPagar.id),
      supabase.from('pf_caixa').insert({
        user_id: user!.id, tipo: 'saida', descricao: showPagar.nome,
        valor: parseFloat(pagarValor), data: pagarData,
        categoria: showPagar.categoria, origem: 'baixa_despesa', referencia_id: showPagar.id,
      }),
    ])
    setShowPagar(null); setSaving(false); load()
  }

  function excluir(id: string) {
    setDlg({ msg: 'Excluir esta despesa?', onOk: async () => { await supabase.from('pf_despesas').delete().eq('id', id); load() } })
  }

  const pendentes = lista.filter(d => d.status === 'pendente')
  const pagas     = lista.filter(d => d.status === 'paga')
  const fixas     = pendentes.filter(d => d.tipo === 'fixo')
  const variaveis = pendentes.filter(d => d.tipo === 'variavel')
  const totalPrev = pendentes.reduce((s, d) => s + Number(d.valor || 0), 0)
  const totalPago = pagas.reduce((s, d) => s + Number(d.valor_pago || d.valor || 0), 0)

  function ItemDespesa({ d, last }: { d: PfDespesa; last: boolean }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: !last ? '1px solid var(--border)' : 'none' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{d.nome}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.categoria && <span style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--s2)', padding: '1px 6px', borderRadius: 6, border: '1px solid var(--border)' }}>{d.categoria}</span>}
            {d.data_prevista && <span style={{ fontSize: 11, color: 'var(--t3)' }}>Vence: {new Date(d.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
            {d.recorrencia && d.recorrencia !== 'única' && <span style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--s2)', padding: '1px 6px', borderRadius: 6, border: '1px solid var(--border)' }}>{d.recorrencia}</span>}
          </div>
        </div>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: d.tipo === 'variavel' && !d.valor ? 'var(--t3)' : 'var(--rose)', flexShrink: 0 }} className="tabular">
          {d.tipo === 'variavel' && !d.valor ? 'variável' : fmt(Number(d.valor))}
        </span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => abrirPagar(d)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(224,48,85,.3)', background: 'var(--rose-dim)', color: 'var(--rose)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Pagar</button>
          <button onClick={() => abrirForm(d)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 13 }}>✏️</button>
          <button onClick={() => excluir(d.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 13 }}>🗑</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>Despesas Fixas</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Contas a pagar</p>
        </div>
        <button onClick={() => abrirForm()} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>+ Nova</button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>A pagar</p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--t1)' }} className="tabular">{fmt(totalPrev)}</p>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ background: 'var(--rose-dim)', border: '1px solid rgba(224,48,85,.2)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: 'var(--rose)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Pago</p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--rose)' }} className="tabular">{fmt(totalPago)}</p>
          <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 2, opacity: .7 }}>{pagas.length} baixada{pagas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>📋</p>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>Nenhuma despesa cadastrada.</p>
        </div>
      ) : (
        <>
          {/* Fixas pendentes */}
          {fixas.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Valor fixo — pendentes</p>
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
                {fixas.map((d, i) => <ItemDespesa key={d.id} d={d} last={i === fixas.length - 1} />)}
              </div>
            </div>
          )}

          {/* Variáveis pendentes */}
          {variaveis.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Valor variável — pendentes</p>
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
                {variaveis.map((d, i) => <ItemDespesa key={d.id} d={d} last={i === variaveis.length - 1} />)}
              </div>
            </div>
          )}

          {/* Pagas */}
          {pagas.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Pagas</p>
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', opacity: .7 }}>
                {pagas.map((d, i) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < pagas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--rose-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="var(--rose)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{d.nome}</p>
                      {d.data_paga && <p style={{ fontSize: 11, color: 'var(--t3)' }}>Pago em {new Date(d.data_paga + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                    </div>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--rose)' }} className="tabular">{fmt(Number(d.valor_pago || d.valor || 0))}</span>
                    <button onClick={() => excluir(d.id)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: nova/editar */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowForm(false)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>{editando ? 'Editar despesa' : 'Nova despesa fixa'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* tipo */}
              <div>
                <label style={{ marginBottom: 8, display: 'block' }}>Tipo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['fixo', 'variavel'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === t ? 'var(--accent)' : 'var(--border)'}`, background: tipo === t ? 'var(--accent-dim)' : 'var(--s2)', color: tipo === t ? 'var(--accent)' : 'var(--t2)' }}>
                      {t === 'fixo' ? 'Valor fixo' : 'Valor variável'}
                    </button>
                  ))}
                </div>
              </div>
              <div><label>Descrição</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Escola, Energia, Netflix…" /></div>
              {tipo === 'fixo' && (
                <div><label>Valor (R$)</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
              )}
              {tipo === 'variavel' && (
                <div><label>Valor estimado (R$) — opcional</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 250,00 (estimativa)" inputMode="decimal" /></div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Data de vencimento</label><input type="date" value={dataPrev} onChange={e => setDataPrev(e.target.value)} /></div>
                <div style={{ flex: 1 }}><label>Recorrência</label>
                  <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)}>
                    {RECORRENCIAS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div><label>Categoria</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">— Selecione —</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvar} disabled={saving || !nome} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: pagar */}
      {showPagar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowPagar(null)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 4 }}>Confirmar pagamento</h3>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>{showPagar.nome}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>{showPagar.tipo === 'variavel' ? 'Valor pago (R$) *' : 'Valor pago (R$)'}</label>
                <input type="number" value={pagarValor} onChange={e => setPagarValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </div>
              <div><label>Data do pagamento</label><input type="date" value={pagarData} onChange={e => setPagarData(e.target.value)} /></div>
              <p style={{ fontSize: 12, color: 'var(--t3)', background: 'var(--s2)', borderRadius: 10, padding: '10px 12px' }}>
                Ao confirmar, o valor será lançado automaticamente no Controle de Caixa como saída.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowPagar(null)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={pagar} disabled={saving || !pagarValor} style={{ flex: 1, padding: '13px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'var(--rose)', color: '#fff' }}>{saving ? 'Salvando…' : 'Confirmar pagamento'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dlg && <ConfirmModal message={dlg.msg} confirmLabel="Excluir" onConfirm={() => { dlg.onOk(); setDlg(null) }} onCancel={() => setDlg(null)} />}
    </div>
  )
}
