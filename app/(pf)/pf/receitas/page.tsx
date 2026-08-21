'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfReceita } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)

export default function ReceitasPage() {
  const supabase = createClient()
  const [lista, setLista] = useState<PfReceita[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<PfReceita | null>(null)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [dia, setDia] = useState('')
  const [saving, setSaving] = useState(false)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('pf_receitas').select('*').order('valor', { ascending: false })
    setLista((data as PfReceita[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function abrirForm(item?: PfReceita) {
    setEditando(item || null)
    setNome(item?.nome || '')
    setValor(item ? String(item.valor) : '')
    setDia(item?.dia_recebimento ? String(item.dia_recebimento) : '')
    setShowForm(true)
  }

  function fecharForm() { setShowForm(false); setEditando(null) }

  async function salvar() {
    if (!nome || !valor) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { nome, valor: parseFloat(valor.replace(',', '.')), dia_recebimento: dia ? parseInt(dia) : null, ativa: true }
    if (editando) {
      await supabase.from('pf_receitas').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('pf_receitas').insert({ ...payload, user_id: user!.id })
    }
    fecharForm()
    await load()
    setSaving(false)
  }

  async function toggleAtiva(item: PfReceita) {
    await supabase.from('pf_receitas').update({ ativa: !item.ativa }).eq('id', item.id)
    setLista(l => l.map(x => x.id === item.id ? { ...x, ativa: !x.ativa } : x))
  }

  function excluir(id: string) {
    setDlg({
      msg: 'Tem certeza que deseja excluir esta receita?',
      onOk: async () => {
        await supabase.from('pf_receitas').delete().eq('id', id)
        setLista(l => l.filter(x => x.id !== id))
      },
    })
  }

  const ativas = lista.filter(r => r.ativa)
  const totalAtivo = ativas.reduce((s, r) => s + Number(r.valor), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>Receitas Fixas</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Salário, aluguéis, renda passiva</p>
        </div>
        <button onClick={() => abrirForm()} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>
          + Nova
        </button>
      </div>

      {/* Total */}
      <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(13,153,101,.2)', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Total mensal ativo</p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--emerald)' }} className="tabular">{fmt(totalAtivo)}</p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--t2)' }}>{ativas.length} ativa{ativas.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>Nenhuma receita cadastrada ainda.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
          {lista.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none', opacity: r.ativa ? 1 : .45 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{r.nome}</p>
                {r.dia_recebimento && <p style={{ fontSize: 12, color: 'var(--t3)' }}>Todo dia {r.dia_recebimento}</p>}
              </div>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--emerald)', flexShrink: 0 }} className="tabular">
                {fmt(Number(r.valor))}
              </span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => toggleAtiva(r)} title={r.ativa ? 'Desativar' : 'Ativar'}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 14 }}>
                  {r.ativa ? '✓' : '○'}
                </button>
                <button onClick={() => abrirForm(r)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                <button onClick={() => excluir(r.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 14 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={fecharForm}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>{editando ? 'Editar receita' : 'Nova receita'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label>Nome / Descrição</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Salário, Aluguel recebido…" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Valor (R$)</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
                <div style={{ width: 110 }}>
                  <label>Dia do mês</label>
                  <select value={dia} onChange={e => setDia(e.target.value)}>
                    <option value="">—</option>
                    {DIAS.map(d => <option key={d} value={d}>Dia {d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={fecharForm} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvar} disabled={saving || !nome || !valor} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
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
