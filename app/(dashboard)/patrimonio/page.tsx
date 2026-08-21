'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtData, hoje } from '@/lib/utils'
import type { Patrimonio } from '@/lib/types'
import Modal from '@/components/shared/Modal'

export default function PatrimonioPage() {
  const supabase = createClient()
  const [bens, setBens] = useState<Patrimonio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Patrimonio | null>(null)
  const [categorias, setCategorias] = useState<string[]>([])

  const [fNome, setFNome] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fValor, setFValor] = useState('')
  const [fData, setFData] = useState(hoje())
  const [fCat, setFCat] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('patrimonio').select('*').order('data_aquisicao', { ascending: false })
    setBens((data as Patrimonio[]) || [])
    const { data: cats } = await supabase.from('categorias').select('nome').order('nome')
    setCategorias((cats || []).map((c: { nome: string }) => c.nome))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function abrirForm(item?: Patrimonio) {
    if (item) {
      setEditItem(item); setFNome(item.nome); setFDesc(item.descricao || '')
      setFValor(String(item.valor)); setFData(item.data_aquisicao); setFCat(item.categoria || '')
    } else {
      setEditItem(null); setFNome(''); setFDesc(''); setFValor(''); setFData(hoje()); setFCat('')
    }
    setShowForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nome: fNome.trim(), descricao: fDesc.trim() || null,
      valor: parseFloat(fValor.replace(',', '.')),
      data_aquisicao: fData, categoria: fCat || null,
    }
    if (editItem) {
      await supabase.from('patrimonio').update(payload).eq('id', editItem.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('patrimonio').insert({ ...payload, user_id: user!.id })
    }
    setSaving(false); setShowForm(false); load()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este bem?')) return
    await supabase.from('patrimonio').delete().eq('id', id)
    load()
  }

  const total = bens.reduce((s, b) => s + Number(b.valor), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showForm && (
        <Modal title={editItem ? 'Editar bem' : 'Novo bem patrimonial'} onClose={() => setShowForm(false)}>
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label>Nome do bem</label><input value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Ex: Notebook, Carro, TV…" required /></div>
            <div><label>Descrição <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(opcional)</span></label><input value={fDesc} onChange={e => setFDesc(e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label>Valor (R$)</label><input inputMode="decimal" value={fValor} onChange={e => setFValor(e.target.value)} required /></div>
              <div><label>Aquisição</label><input type="date" value={fData} onChange={e => setFData(e.target.value)} required /></div>
            </div>
            <div>
              <label>Categoria</label>
              <select value={fCat} onChange={e => setFCat(e.target.value)}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn-primary" style={{ height: 48 }}>
              {saving ? 'Salvando…' : editItem ? 'Salvar' : 'Adicionar bem'}
            </button>
          </form>
        </Modal>
      )}

      {/* Header: totais + botão */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        {/* Card total */}
        <div style={{
          flex: 1,
          background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18,
          padding: '14px 18px', display: 'flex', gap: 24,
          boxShadow: '0 1px 4px rgba(15,22,41,.04)',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
              Total
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--accent)' }} className="tabular">
              {fmt(total)}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
              Bens
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>
              {bens.length}
            </div>
          </div>
        </div>
        {/* Botão */}
        <button onClick={() => abrirForm()} className="btn-primary" style={{ padding: '0 18px', fontSize: 13, borderRadius: 14, flexShrink: 0 }}>
          + Novo
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : bens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
          Nenhum bem cadastrado
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bens.map(b => (
            <div key={b.id} style={{
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 1px 3px rgba(15,22,41,.04)',
            }}>
              {/* Ícone */}
              <div style={{
                width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                background: 'var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>🏢</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.nome}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                  {fmtData(b.data_aquisicao)}
                  {b.categoria ? ` · ${b.categoria}` : ''}
                  {b.descricao ? ` · ${b.descricao}` : ''}
                </div>
              </div>

              {/* Valor */}
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--t1)', flexShrink: 0 }} className="tabular">
                {fmt(Number(b.valor))}
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => abrirForm(b)}
                  style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  ✏️
                </button>
                <button onClick={() => excluir(b.id)}
                  style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
