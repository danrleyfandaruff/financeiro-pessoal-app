'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, hoje } from '@/lib/utils'
import type { ContaReceber } from '@/lib/types'
import ListaContas from '@/components/contas/ListaContas'
import Modal from '@/components/shared/Modal'

type Filtro = 'todos' | 'pendentes' | 'pagos'

export default function AReceberPage() {
  const supabase = createClient()
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('pendentes')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ContaReceber | null>(null)
  const [categorias, setCategorias] = useState<string[]>([])

  const [fDesc, setFDesc] = useState('')
  const [fValor, setFValor] = useState('')
  const [fVenc, setFVenc] = useState(hoje())
  const [fCat, setFCat] = useState('')
  const [fObs, setFObs] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('contas_receber').select('*').order('vencimento')
    if (filtro === 'pendentes') q = q.eq('pago', false)
    if (filtro === 'pagos')     q = q.eq('pago', true)
    const { data } = await q
    setContas((data as ContaReceber[]) || [])
    const { data: cats } = await supabase.from('categorias').select('nome').in('tipo', ['entrada','ambos']).order('nome')
    setCategorias((cats || []).map((c: { nome: string }) => c.nome))
    setLoading(false)
  }, [filtro])

  useEffect(() => { load() }, [load])

  function abrirForm(item?: ContaReceber) {
    if (item) {
      setEditItem(item); setFDesc(item.descricao); setFValor(String(item.valor))
      setFVenc(item.vencimento); setFCat(item.categoria || ''); setFObs(item.observacoes || '')
    } else {
      setEditItem(null); setFDesc(''); setFValor(''); setFVenc(hoje()); setFCat(''); setFObs('')
    }
    setShowForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { descricao: fDesc.trim(), valor: parseFloat(fValor.replace(',', '.')), vencimento: fVenc, categoria: fCat || null, observacoes: fObs.trim() || null }
    if (editItem) {
      await supabase.from('contas_receber').update(payload).eq('id', editItem.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('contas_receber').insert({ ...payload, user_id: user!.id })
    }
    setSaving(false); setShowForm(false); load()
  }

  const pendente  = contas.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0)
  const recebido  = contas.filter(c =>  c.pago).reduce((s, c) => s + Number(c.valor), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showForm && (
        <Modal title={editItem ? 'Editar conta' : 'Nova conta a receber'} onClose={() => setShowForm(false)}>
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label>Descrição</label><input value={fDesc} onChange={e => setFDesc(e.target.value)} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label>Valor (R$)</label><input inputMode="decimal" value={fValor} onChange={e => setFValor(e.target.value)} required /></div>
              <div><label>Vencimento</label><input type="date" value={fVenc} onChange={e => setFVenc(e.target.value)} required /></div>
            </div>
            <div>
              <label>Categoria</label>
              <select value={fCat} onChange={e => setFCat(e.target.value)}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label>Observações</label><input value={fObs} onChange={e => setFObs(e.target.value)} /></div>
            <button type="submit" disabled={saving} className="btn-primary" style={{ height: 48 }}>
              {saving ? 'Salvando…' : editItem ? 'Salvar' : 'Adicionar conta'}
            </button>
          </form>
        </Modal>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['pendentes','todos','pagos'] as Filtro[]).map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`chip${filtro === f ? ' active' : ''}`}>
              {f === 'pendentes' ? 'Pendentes' : f === 'todos' ? 'Todos' : 'Recebidos'}
            </button>
          ))}
        </div>
        <button onClick={() => abrirForm()} className="btn-primary" style={{ marginLeft: 'auto', padding: '9px 16px', fontSize: 13 }}>
          + Nova conta
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--emerald)', marginBottom: 4, fontWeight: 500 }}>A Receber</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--emerald)' }} className="tabular">{fmt(pendente)}</div>
        </div>
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4, fontWeight: 500 }}>Já recebido</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)' }} className="tabular">{fmt(recebido)}</div>
        </div>
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>Carregando…</div>
        : <ListaContas contas={contas} tipo="receber" onRefresh={load} onEdit={c => abrirForm(c as ContaReceber)} />}
    </div>
  )
}
