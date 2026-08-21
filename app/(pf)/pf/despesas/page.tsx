'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfDespesa } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)
const CATS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinatura', 'Dívida/Empréstimo', 'Outros']

export default function DespesasPage() {
  const supabase = createClient()
  const [lista, setLista] = useState<PfDespesa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<PfDespesa | null>(null)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [dia, setDia] = useState('')
  const [categoria, setCategoria] = useState('')
  const [saving, setSaving] = useState(false)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('pf_despesas').select('*').order('valor', { ascending: false })
    setLista((data as PfDespesa[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function abrirForm(item?: PfDespesa) {
    setEditando(item || null)
    setNome(item?.nome || '')
    setValor(item ? String(item.valor) : '')
    setDia(item?.dia_vencimento ? String(item.dia_vencimento) : '')
    setCategoria(item?.categoria || '')
    setShowForm(true)
  }

  function fecharForm() { setShowForm(false); setEditando(null) }

  async function salvar() {
    if (!nome || !valor) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { nome, valor: parseFloat(valor.replace(',', '.')), dia_vencimento: dia ? parseInt(dia) : null, categoria: categoria || null, ativa: true }
    if (editando) {
      await supabase.from('pf_despesas').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('pf_despesas').insert({ ...payload, user_id: user!.id })
    }
    fecharForm()
    await load()
    setSaving(false)
  }

  async function toggleAtiva(item: PfDespesa) {
    await supabase.from('pf_despesas').update({ ativa: !item.ativa }).eq('id', item.id)
    setLista(l => l.map(x => x.id === item.id ? { ...x, ativa: !x.ativa } : x))
  }

  function excluir(id: string) {
    setDlg({
      msg: 'Tem certeza que deseja excluir esta despesa?',
      onOk: async () => {
        await supabase.from('pf_despesas').delete().eq('id', id)
        setLista(l => l.filter(x => x.id !== id))
      },
    })
  }

  const ativas = lista.filter(d => d.ativa)
  const totalAtivo = ativas.reduce((s, d) => s + Number(d.valor), 0)

  const porCategoria = ativas.reduce<Record<string, number>>((acc, d) => {
    const k = d.categoria || 'Outros'
    acc[k] = (acc[k] || 0) + Number(d.valor)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>Despesas Fixas</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Aluguel, assinaturas, dívidas</p>
        </div>
        <button onClick={() => abrirForm()} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>+ Nova</button>
      </div>

      <div style={{ background: 'var(--rose-dim)', border: '1px solid rgba(224,48,85,.2)', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--rose)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Total mensal ativo</p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--rose)' }} className="tabular">{fmt(totalAtivo)}</p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--t2)' }}>{ativas.length} ativa{ativas.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Por categoria */}
      {Object.keys(porCategoria).length > 1 && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>Por categoria</p>
          {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
            const pct = totalAtivo > 0 ? (val / totalAtivo) * 100 : 0
            return (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--t1)' }}>{cat}</span>
                  <span style={{ fontSize: 13, color: 'var(--t2)' }} className="tabular">{fmt(val)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--s2)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--rose)', borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>Nenhuma despesa cadastrada ainda.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
          {lista.map((d, i) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none', opacity: d.ativa ? 1 : .45 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{d.nome}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {d.categoria && <span style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--s2)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)' }}>{d.categoria}</span>}
                  {d.dia_vencimento && <span style={{ fontSize: 11, color: 'var(--t3)' }}>Vence dia {d.dia_vencimento}</span>}
                </div>
              </div>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--rose)', flexShrink: 0 }} className="tabular">{fmt(Number(d.valor))}</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => toggleAtiva(d)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 14 }}>{d.ativa ? '✓' : '○'}</button>
                <button onClick={() => abrirForm(d)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                <button onClick={() => excluir(d.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 14 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={fecharForm}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>{editando ? 'Editar despesa' : 'Nova despesa'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label>Nome / Descrição</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Aluguel, Netflix…" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Valor (R$)</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
                <div style={{ width: 110 }}><label>Vence dia</label><select value={dia} onChange={e => setDia(e.target.value)}><option value="">—</option>{DIAS.map(d => <option key={d} value={d}>Dia {d}</option>)}</select></div>
              </div>
              <div><label>Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">— Sem categoria —</option>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
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
