'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfReceita, PfBanco } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hoje = () => new Date().toISOString().split('T')[0]

const RECORRENCIAS = ['mensal', 'semanal', 'quinzenal', 'anual', 'única']

function nextData(date: string, rec: string): string {
  const d = new Date(date + 'T12:00:00')
  if (rec === 'semanal') d.setDate(d.getDate() + 7)
  else if (rec === 'quinzenal') d.setDate(d.getDate() + 15)
  else if (rec === 'anual') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

type BaixarStep = 'form' | 'success'

export default function ReceitasPage() {
  const supabase = createClient()
  const [lista, setLista] = useState<PfReceita[]>([])
  const [bancos, setBancos] = useState<PfBanco[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<PfReceita | null>(null)
  const [showBaixar, setShowBaixar] = useState<PfReceita | null>(null)
  const [baixarStep, setBaixarStep] = useState<BaixarStep>('form')
  const [proximoData, setProximoData] = useState('')
  const [saving, setSaving] = useState(false)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)

  // Form fields
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [dataPrev, setDataPrev] = useState('')
  const [recorrencia, setRecorrencia] = useState('mensal')

  // Baixar fields
  const [baixaValor, setBaixaValor] = useState('')
  const [baixaData, setBaixaData] = useState(hoje())
  const [baixaBancoId, setBaixaBancoId] = useState('')

  const load = useCallback(async () => {
    const [r, b] = await Promise.all([
      supabase.from('pf_receitas').select('*').order('data_prevista', { ascending: true }),
      supabase.from('pf_bancos').select('*').order('nome'),
    ])
    setLista((r.data as PfReceita[]) || [])
    setBancos((b.data as PfBanco[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function abrirForm(item?: PfReceita) {
    setEditando(item || null)
    setNome(item?.nome || '')
    setValor(item?.valor ? String(item.valor) : '')
    setDataPrev(item?.data_prevista || '')
    setRecorrencia(item?.recorrencia || 'mensal')
    setShowForm(true)
  }

  function abrirBaixar(item: PfReceita) {
    setShowBaixar(item)
    setBaixaValor(String(item.valor))
    setBaixaData(hoje())
    setBaixaBancoId('')
    setBaixarStep('form')
  }

  async function salvar() {
    if (!nome || !valor) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { nome, valor: parseFloat(valor), data_prevista: dataPrev || null, recorrencia, ativa: true, status: 'pendente' as const }
    if (editando) {
      await supabase.from('pf_receitas').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('pf_receitas').insert({ ...payload, user_id: user!.id })
    }
    setShowForm(false); setSaving(false); load()
  }

  async function baixar() {
    if (!showBaixar || !baixaValor || !baixaData) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await Promise.all([
      supabase.from('pf_receitas').update({ status: 'recebida', data_recebida: baixaData, valor_recebido: parseFloat(baixaValor) }).eq('id', showBaixar.id),
      supabase.from('pf_caixa').insert({
        user_id: user!.id, tipo: 'entrada', descricao: showBaixar.nome,
        valor: parseFloat(baixaValor), data: baixaData,
        categoria: 'Salário/Receita', origem: 'baixa_receita', referencia_id: showBaixar.id,
        banco_id: baixaBancoId || null,
      }),
    ])
    await load()
    setSaving(false)
    // Se tem recorrência, oferecer criar o próximo período
    if (showBaixar.recorrencia && showBaixar.recorrencia !== 'única') {
      const base = showBaixar.data_prevista || baixaData
      setProximoData(nextData(base, showBaixar.recorrencia))
      setBaixarStep('success')
    } else {
      setShowBaixar(null)
    }
  }

  async function criarProximo() {
    if (!showBaixar) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pf_receitas').insert({
      user_id: user!.id,
      nome: showBaixar.nome,
      valor: showBaixar.valor,
      data_prevista: proximoData,
      recorrencia: showBaixar.recorrencia,
      status: 'pendente',
      ativa: true,
    })
    setShowBaixar(null); setSaving(false); load()
  }

  async function reabrir(item: PfReceita) {
    setSaving(true)
    await Promise.all([
      supabase.from('pf_caixa').delete().eq('referencia_id', item.id).eq('origem', 'baixa_receita'),
      supabase.from('pf_receitas').update({ status: 'pendente', data_recebida: null, valor_recebido: null }).eq('id', item.id),
    ])
    setSaving(false); load()
  }

  function excluir(id: string) {
    setDlg({ msg: 'Excluir esta entrada? Ela precisa estar pendente para ser excluída.', onOk: async () => { await supabase.from('pf_receitas').delete().eq('id', id); load() } })
  }

  const pendentes  = lista.filter(r => r.status === 'pendente')
  const recebidas  = lista.filter(r => r.status === 'recebida')
  const totalPrev  = pendentes.reduce((s, r) => s + Number(r.valor), 0)
  const totalReceb = recebidas.reduce((s, r) => s + Number(r.valor_recebido || r.valor), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>Salários e Entradas Fixas</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Previsões de recebimento</p>
        </div>
        <button onClick={() => abrirForm()} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>+ Nova</button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Previsto</p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--t1)' }} className="tabular">{fmt(totalPrev)}</p>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ background: 'rgba(13,153,101,.06)', border: '1px solid rgba(13,153,101,.2)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Recebido</p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--emerald)' }} className="tabular">{fmt(totalReceb)}</p>
          <p style={{ fontSize: 11, color: 'var(--emerald)', marginTop: 2, opacity: .7 }}>{recebidas.length} baixada{recebidas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>💰</p>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>Nenhuma entrada cadastrada.</p>
          <p style={{ color: 'var(--t3)', fontSize: 12, marginTop: 4 }}>Cadastre salários, aluguéis e outras receitas fixas.</p>
        </div>
      ) : (
        <>
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Pendentes</p>
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
                {pendentes.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < pendentes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{r.nome}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.data_prevista && <span style={{ fontSize: 11, color: 'var(--t3)' }}>Previsto: {new Date(r.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                        {r.recorrencia && r.recorrencia !== 'única' && <span style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--s2)', padding: '1px 6px', borderRadius: 6, border: '1px solid var(--border)' }}>{r.recorrencia}</span>}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--emerald)', flexShrink: 0 }} className="tabular">{fmt(Number(r.valor))}</span>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => abrirBaixar(r)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(13,153,101,.3)', background: 'rgba(13,153,101,.08)', color: 'var(--emerald)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Baixar</button>
                      <button onClick={() => abrirForm(r)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                      <button onClick={() => excluir(r.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recebidas — só Reabrir, sem excluir direto */}
          {recebidas.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Recebidas</p>
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', opacity: .8 }}>
                {recebidas.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < recebidas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(13,153,101,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="var(--emerald)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{r.nome}</p>
                      {r.data_recebida && <p style={{ fontSize: 11, color: 'var(--t3)' }}>Recebido em {new Date(r.data_recebida + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                    </div>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--emerald)' }} className="tabular">{fmt(Number(r.valor_recebido || r.valor))}</span>
                    <button
                      onClick={() => setDlg({ msg: `Reabrir "${r.nome}"? O lançamento do caixa será removido e a entrada voltará para pendente.`, onOk: () => reabrir(r) })}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--t2)', flexShrink: 0 }}
                    >
                      ↩ Reabrir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: nova/editar entrada */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowForm(false)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>{editando ? 'Editar entrada' : 'Nova entrada fixa'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label>Descrição</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Salário, Aluguel recebido…" /></div>
              <div><label>Valor (R$)</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Data prevista</label><input type="date" value={dataPrev} onChange={e => setDataPrev(e.target.value)} /></div>
                <div style={{ flex: 1 }}><label>Recorrência</label>
                  <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)}>
                    {RECORRENCIAS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvar} disabled={saving || !nome || !valor} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: baixar */}
      {showBaixar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowBaixar(null)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

            {baixarStep === 'form' ? (
              <>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 4 }}>Confirmar recebimento</h3>
                <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>{showBaixar.nome}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label>Valor recebido (R$)</label><input type="number" value={baixaValor} onChange={e => setBaixaValor(e.target.value)} inputMode="decimal" /></div>
                  <div><label>Data de recebimento</label><input type="date" value={baixaData} onChange={e => setBaixaData(e.target.value)} /></div>
                  {bancos.length > 0 && (
                    <div>
                      <label style={{ marginBottom: 8, display: 'block' }}>Banco (opcional)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button type="button" onClick={() => setBaixaBancoId('')}
                          style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `2px solid ${!baixaBancoId ? 'var(--accent)' : 'var(--border)'}`, background: !baixaBancoId ? 'var(--accent-dim)' : 'var(--s2)', color: !baixaBancoId ? 'var(--accent)' : 'var(--t2)' }}>
                          Geral
                        </button>
                        {bancos.map(b => (
                          <button key={b.id} type="button" onClick={() => setBaixaBancoId(b.id)}
                            style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `2px solid ${baixaBancoId === b.id ? (b.cor || 'var(--accent)') : 'var(--border)'}`, background: baixaBancoId === b.id ? `${b.cor || 'var(--accent)'}22` : 'var(--s2)', color: baixaBancoId === b.id ? (b.cor || 'var(--accent)') : 'var(--t2)' }}>
                            {b.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--t3)', background: 'var(--s2)', borderRadius: 10, padding: '10px 12px' }}>
                    Ao confirmar, o valor será lançado no Controle de Caixa como entrada.
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={() => setShowBaixar(null)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                    <button onClick={baixar} disabled={saving || !baixaValor} style={{ flex: 1, padding: '13px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'var(--emerald)', color: '#fff' }}>{saving ? 'Confirmando…' : 'Confirmar recebimento'}</button>
                  </div>
                </div>
              </>
            ) : (
              /* Passo 2: oferecer criar previsão do próximo período */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(13,153,101,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M5 14l6 6L23 8" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 6 }}>Recebimento confirmado!</p>
                  <p style={{ fontSize: 13, color: 'var(--t2)' }}>
                    Esta entrada é <strong>{showBaixar.recorrencia}</strong>. Deseja criar a previsão do próximo período?
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6, background: 'var(--s2)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
                    Nova data prevista: {new Date(proximoData + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
                  <button onClick={() => setShowBaixar(null)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Não obrigado</button>
                  <button onClick={criarProximo} disabled={saving} style={{ flex: 1, padding: '13px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'var(--emerald)', color: '#fff' }}>{saving ? 'Criando…' : '+ Criar previsão'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {dlg && <ConfirmModal message={dlg.msg} confirmLabel="Confirmar" onConfirm={() => { dlg.onOk(); setDlg(null) }} onCancel={() => setDlg(null)} />}
    </div>
  )
}
