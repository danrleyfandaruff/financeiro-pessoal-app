'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Categoria } from '@/lib/types'
import Modal from '@/components/shared/Modal'

export default function CategoriasPage() {
  const supabase = createClient()
  const [cats, setCats] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fNome, setFNome] = useState('')
  const [fTipo, setFTipo] = useState<'entrada' | 'saida' | 'ambos'>('saida')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('categorias').select('*').order('nome')
    setCats((data as Categoria[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('categorias').insert({ user_id: user!.id, nome: fNome.trim(), tipo: fTipo })
    setSaving(false); setShowForm(false); setFNome(''); load()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta categoria?')) return
    await supabase.from('categorias').delete().eq('id', id)
    load()
  }

  const grupos = {
    entrada: cats.filter(c => c.tipo === 'entrada'),
    saida:   cats.filter(c => c.tipo === 'saida'),
    ambos:   cats.filter(c => c.tipo === 'ambos'),
  }

  const tipoMeta: Record<string, { label: string; cor: string; bg: string }> = {
    entrada: { label: '↓ Receitas',  cor: 'var(--emerald)', bg: 'var(--emerald-dim)' },
    saida:   { label: '↑ Despesas',  cor: 'var(--rose)',    bg: 'var(--rose-dim)' },
    ambos:   { label: '↕ Ambos',     cor: 'var(--accent)',  bg: 'var(--accent-dim)' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {showForm && (
        <Modal title="Nova categoria" onClose={() => setShowForm(false)} size="sm">
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label>Nome</label><input value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Ex: Salário, Aluguel…" required /></div>
            <div>
              <label>Tipo</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
                {(['entrada','saida','ambos'] as const).map(t => {
                  const m = tipoMeta[t]
                  const active = fTipo === t
                  return (
                    <button key={t} type="button" onClick={() => setFTipo(t)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? m.cor : 'var(--border)'}`,
                        background: active ? m.bg : 'var(--s2)',
                        color: active ? m.cor : 'var(--t2)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                      }}>
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary" style={{ height: 48 }}>
              {saving ? 'Salvando…' : 'Criar categoria'}
            </button>
          </form>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
          + Nova categoria
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(Object.entries(grupos) as [keyof typeof grupos, Categoria[]][]).map(([tipo, lista]) => lista.length > 0 && (
            <div key={tipo}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tipoMeta[tipo].cor, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                {tipoMeta[tipo].label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}
                className="sm:grid-cols-3 md:grid-cols-4">
                {lista.map(c => (
                  <div key={c.id} style={{
                    background: 'var(--s1)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}>
                    <span style={{ fontSize: 14, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.nome}
                    </span>
                    <button onClick={() => excluir(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 0 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {cats.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏷️</div>
              Nenhuma categoria cadastrada.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
