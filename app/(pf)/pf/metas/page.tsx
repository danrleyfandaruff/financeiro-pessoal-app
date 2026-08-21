'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfMeta } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const CATS_META = ['Reserva de emergência', 'Viagem', 'Imóvel', 'Veículo', 'Educação', 'Aposentadoria', 'Investimento', 'Outros']
const CORES = ['#E8A80C', '#0D9965', '#6366f1', '#E03055', '#0ea5e9', '#f97316', '#8b5cf6', '#0F1629']

export default function MetasPage() {
  const supabase = createClient()
  const [metas, setMetas] = useState<PfMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAportar, setShowAportar] = useState<PfMeta | null>(null)
  const [editando, setEditando] = useState<PfMeta | null>(null)

  const [nome, setNome] = useState('')
  const [valorMeta, setValorMeta] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [prazo, setPrazo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [cor, setCor] = useState(CORES[0])
  const [aporte, setAporte] = useState('')
  const [saving, setSaving] = useState(false)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('pf_metas').select('*').order('criado_em')
    setMetas((data as PfMeta[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function abrirForm(item?: PfMeta) {
    setEditando(item || null)
    setNome(item?.nome || '')
    setValorMeta(item ? String(item.valor_meta) : '')
    setValorAtual(item ? String(item.valor_atual) : '0')
    setPrazo(item?.prazo || '')
    setCategoria(item?.categoria || '')
    setCor(item?.cor || CORES[0])
    setShowForm(true)
  }

  async function salvar() {
    if (!nome || !valorMeta) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      nome, valor_meta: parseFloat(valorMeta.replace(',', '.')),
      valor_atual: parseFloat(valorAtual.replace(',', '.') || '0'),
      prazo: prazo || null, categoria: categoria || null, cor,
    }
    if (editando) {
      await supabase.from('pf_metas').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('pf_metas').insert({ ...payload, user_id: user!.id })
    }
    setShowForm(false); setEditando(null)
    await load(); setSaving(false)
  }

  async function salvarAporte() {
    if (!showAportar || !aporte) return
    setSaving(true)
    const novoAtual = Number(showAportar.valor_atual) + parseFloat(aporte.replace(',', '.'))
    await supabase.from('pf_metas').update({ valor_atual: novoAtual }).eq('id', showAportar.id)
    setShowAportar(null); setAporte('')
    await load(); setSaving(false)
  }

  function excluir(id: string) {
    setDlg({
      msg: 'Tem certeza que deseja excluir esta meta? O progresso registrado será perdido.',
      onOk: async () => {
        await supabase.from('pf_metas').delete().eq('id', id)
        setMetas(l => l.filter(x => x.id !== id))
      },
    })
  }

  const totalInvestido = metas.reduce((s, m) => s + Number(m.valor_atual), 0)
  const totalMeta = metas.reduce((s, m) => s + Number(m.valor_meta), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>Metas e Investimentos</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Patrimônio e objetivos financeiros</p>
        </div>
        <button onClick={() => abrirForm()} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>+ Nova meta</button>
      </div>

      {/* Resumo geral */}
      {metas.length > 0 && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total investido</p>
              <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)' }} className="tabular">{fmt(totalInvestido)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total das metas</p>
              <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t2)' }} className="tabular">{fmt(totalMeta)}</p>
            </div>
          </div>
          <div style={{ height: 8, background: 'var(--s2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalMeta > 0 ? Math.min(100, (totalInvestido / totalMeta) * 100) : 0}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width .5s' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>
            {totalMeta > 0 ? `${((totalInvestido / totalMeta) * 100).toFixed(1)}% do objetivo total` : ''}
          </p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : metas.length === 0 ? (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: 6 }}>Nenhuma meta cadastrada.</p>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>Crie metas para reserva de emergência, viagens, imóvel e mais.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metas.map(m => {
            const pct = Math.min(100, (Number(m.valor_atual) / Number(m.valor_meta)) * 100)
            const falta = Math.max(0, Number(m.valor_meta) - Number(m.valor_atual))
            const concluida = pct >= 100

            return (
              <div key={m.id} style={{ background: 'var(--s1)', border: `1px solid ${concluida ? 'rgba(13,153,101,.3)' : 'var(--border)'}`, borderRadius: 18, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.cor || 'var(--accent)', marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>{m.nome}</p>
                      {concluida && <span style={{ fontSize: 11, background: 'var(--emerald-dim)', color: 'var(--emerald)', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>✓ Concluída</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {m.categoria && <span style={{ fontSize: 11, color: 'var(--t3)' }}>{m.categoria}</span>}
                      {m.prazo && <span style={{ fontSize: 11, color: 'var(--t3)' }}>· Prazo: {new Date(m.prazo + 'T12:00').toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => abrirForm(m)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                    <button onClick={() => excluir(m.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--t2)' }} className="tabular">{fmt(Number(m.valor_atual))} guardado</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }} className="tabular">{fmt(Number(m.valor_meta))}</span>
                </div>
                <div style={{ height: 8, background: 'var(--s2)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: m.cor || 'var(--accent)', borderRadius: 4 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                    {pct.toFixed(1)}% · {falta > 0 ? `Faltam ${fmt(falta)}` : 'Meta atingida! 🎉'}
                  </span>
                  {!concluida && (
                    <button onClick={() => { setShowAportar(m); setAporte('') }}
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(232,168,12,.3)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
                      + Aportar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: nova/editar meta */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => { setShowForm(false); setEditando(null) }}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '90svh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>{editando ? 'Editar meta' : 'Nova meta'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label>Nome da meta</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Reserva emergência, Viagem…" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Valor da meta (R$)</label><input type="number" value={valorMeta} onChange={e => setValorMeta(e.target.value)} placeholder="0,00" /></div>
                <div style={{ flex: 1 }}><label>Já tenho (R$)</label><input type="number" value={valorAtual} onChange={e => setValorAtual(e.target.value)} placeholder="0,00" /></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">—</option>{CATS_META.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div style={{ flex: 1 }}><label>Prazo</label><input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} /></div>
              </div>
              <div>
                <label>Cor</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {CORES.map(c => (
                    <button key={c} onClick={() => setCor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: cor === c ? '3px solid var(--t1)' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => { setShowForm(false); setEditando(null) }} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvar} disabled={saving || !nome || !valorMeta} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: aportar */}
      {showAportar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowAportar(null)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 4 }}>Aportar em: {showAportar.nome}</h3>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
              Saldo atual: {fmt(Number(showAportar.valor_atual))} · Meta: {fmt(Number(showAportar.valor_meta))}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label>Valor a aportar (R$)</label><input type="number" value={aporte} onChange={e => setAporte(e.target.value)} placeholder="0,00" inputMode="decimal" autoFocus /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowAportar(null)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvarAporte} disabled={saving || !aporte} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Confirmar aporte'}</button>
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
