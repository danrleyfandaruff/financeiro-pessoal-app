'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PfCartao, PfLancamentoCartao } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)
const CATS_CARTAO = ['Alimentação', 'Mercado', 'Lazer', 'Transporte', 'Saúde', 'Vestuário', 'Assinatura', 'Viagem', 'Outros']

function mesAtual() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`
}

export default function CartaoPage() {
  const supabase = createClient()
  const [cartoes, setCartoes] = useState<PfCartao[]>([])
  const [lancamentos, setLancamentos] = useState<PfLancamentoCartao[]>([])
  const [loading, setLoading] = useState(true)
  const [showCartaoForm, setShowCartaoForm] = useState(false)
  const [showLancForm, setShowLancForm] = useState(false)
  const [cartaoAberto, setCartaoAberto] = useState<string | null>(null)

  // Cartão form
  const [cNome, setCNome] = useState('')
  const [cBandeira, setCBandeira] = useState('')
  const [cLimite, setCLimite] = useState('')
  const [cFech, setCFech] = useState('')
  const [cVenc, setCVenc] = useState('')

  // Lançamento form
  const [lCartaoId, setLCartaoId] = useState('')
  const [lDesc, setLDesc] = useState('')
  const [lValor, setLValor] = useState('')
  const [lData, setLData] = useState(new Date().toISOString().split('T')[0])
  const [lCat, setLCat] = useState('')
  const [lParcelas, setLParcelas] = useState('1')
  const [saving, setSaving] = useState(false)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void } | null>(null)
  const [showPagarFatura, setShowPagarFatura] = useState<{ cartao: typeof cartoes[0]; fatura: number } | null>(null)
  const [faturaData, setFaturaData] = useState('')

  const mes = mesAtual()

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([
      supabase.from('pf_cartoes').select('*').order('nome'),
      supabase.from('pf_lancamentos_cartao').select('*').gte('data', `${mes}-01`).lte('data', `${mes}-31`).order('data', { ascending: false }),
    ])
    setCartoes((c.data as PfCartao[]) || [])
    setLancamentos((l.data as PfLancamentoCartao[]) || [])
    setLoading(false)
  }, [mes])

  useEffect(() => { load() }, [load])

  async function salvarCartao() {
    if (!cNome || !cFech || !cVenc) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pf_cartoes').insert({
      user_id: user!.id, nome: cNome, bandeira: cBandeira || null,
      limite: parseFloat(cLimite || '0'), dia_fechamento: parseInt(cFech), dia_vencimento: parseInt(cVenc),
    })
    setShowCartaoForm(false); setCNome(''); setCBandeira(''); setCLimite(''); setCFech(''); setCVenc('')
    await load(); setSaving(false)
  }

  function excluirCartao(id: string) {
    setDlg({
      msg: 'Tem certeza? Isso irá excluir o cartão e todos os lançamentos associados.',
      onOk: async () => {
        await supabase.from('pf_lancamentos_cartao').delete().eq('cartao_id', id)
        await supabase.from('pf_cartoes').delete().eq('id', id)
        await load()
      },
    })
  }

  async function salvarLanc() {
    if (!lCartaoId || !lDesc || !lValor) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const parcelas = parseInt(lParcelas) || 1
    const valorParcela = parseFloat(lValor.replace(',', '.')) / parcelas
    const inserts = Array.from({ length: parcelas }, (_, i) => {
      const d = new Date(lData)
      d.setMonth(d.getMonth() + i)
      return {
        user_id: user!.id, cartao_id: lCartaoId,
        descricao: parcelas > 1 ? `${lDesc} (${i + 1}/${parcelas})` : lDesc,
        categoria: lCat || null,
        valor: parseFloat(valorParcela.toFixed(2)),
        data: d.toISOString().split('T')[0],
        parcelas, parcela_atual: i + 1,
      }
    })
    await supabase.from('pf_lancamentos_cartao').insert(inserts)
    setShowLancForm(false); setLDesc(''); setLValor(''); setLCat(''); setLParcelas('1')
    await load(); setSaving(false)
  }

  async function excluirLanc(id: string) {
    await supabase.from('pf_lancamentos_cartao').delete().eq('id', id)
    setLancamentos(l => l.filter(x => x.id !== id))
  }

  async function pagarFatura() {
    if (!showPagarFatura || !faturaData) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const mesLabel = new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    await supabase.from('pf_caixa').insert({
      user_id: user!.id, tipo: 'saida',
      descricao: `Fatura ${showPagarFatura.cartao.nome} — ${mesLabel}`,
      valor: showPagarFatura.fatura, data: faturaData,
      categoria: 'Cartão de crédito', origem: 'pagamento_fatura',
      referencia_id: showPagarFatura.cartao.id,
    })
    setShowPagarFatura(null); setFaturaData(''); setSaving(false)
  }

  const faturaTotal = lancamentos.reduce((s, l) => s + Number(l.valor), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>Cartões de Crédito</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
            Fatura de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowLancForm(true)} className="btn-primary" style={{ padding: '9px 14px', fontSize: 13 }}>+ Lançamento</button>
          <button onClick={() => setShowCartaoForm(true)} style={{ padding: '9px 14px', fontSize: 13, background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--t1)', fontWeight: 500 }}>+ Cartão</button>
        </div>
      </div>

      {/* Total fatura */}
      <div style={{ background: '#0F1629', borderRadius: 18, padding: '20px 22px', color: '#fff' }}>
        <p style={{ fontSize: 12, opacity: .6, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Total da fatura</p>
        <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 800, color: '#E8A80C' }} className="tabular">{fmt(faturaTotal)}</p>
        <p style={{ fontSize: 12, opacity: .5, marginTop: 4 }}>{lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} este mês</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Carregando…</div>
      ) : (
        <>
          {/* Cartões */}
          {cartoes.map(c => {
            const lancsCartao = lancamentos.filter(l => l.cartao_id === c.id)
            const faturaCartao = lancsCartao.reduce((s, l) => s + Number(l.valor), 0)
            const usoPct = c.limite > 0 ? Math.min(100, (faturaCartao / c.limite) * 100) : 0
            const aberto = cartaoAberto === c.id

            return (
              <div key={c.id} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
                <button onClick={() => setCartaoAberto(aberto ? null : c.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 44, height: 30, borderRadius: 8, background: c.cor || '#0F1629', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{c.bandeira || '💳'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{c.nome}</p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>Fecha dia {c.dia_fechamento} · Vence dia {c.dia_vencimento}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--t1)' }} className="tabular">{fmt(faturaCartao)}</p>
                    {c.limite > 0 && <p style={{ fontSize: 11, color: 'var(--t3)' }}>de {fmt(c.limite)}</p>}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transition: 'transform .2s', transform: aberto ? 'rotate(180deg)' : '' }}>
                    <path d="M4 6l4 4 4-4" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {c.limite > 0 && (
                  <div style={{ height: 3, background: 'var(--s2)', margin: '0 18px' }}>
                    <div style={{ height: '100%', width: `${usoPct}%`, background: usoPct > 80 ? 'var(--rose)' : 'var(--accent)', borderRadius: 2 }} />
                  </div>
                )}

                {aberto && (
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 8 }}>
                    {lancsCartao.length === 0 ? (
                      <p style={{ padding: '16px 18px', fontSize: 13, color: 'var(--t3)' }}>Nenhum lançamento neste mês.</p>
                    ) : lancsCartao.map((l, i) => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderBottom: i < lancsCartao.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', marginBottom: 2 }}>{l.descricao}</p>
                          <p style={{ fontSize: 11, color: 'var(--t3)' }}>{new Date(l.data + 'T12:00').toLocaleDateString('pt-BR')}{l.categoria && ` · ${l.categoria}`}</p>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', flexShrink: 0 }} className="tabular">{fmt(Number(l.valor))}</span>
                        <button onClick={() => excluirLanc(l.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--s2)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                    <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {faturaCartao > 0 && (
                        <button onClick={() => { setShowPagarFatura({ cartao: c, fatura: faturaCartao }); setFaturaData(new Date().toISOString().split('T')[0]) }}
                          style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(232,168,12,.25)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                          Pagar fatura ({fmt(faturaCartao)})
                        </button>
                      )}
                      <button onClick={() => excluirCartao(c.id)} style={{ fontSize: 12, color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>Excluir cartão</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {cartoes.length === 0 && (
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--t2)', fontSize: 14 }}>Nenhum cartão cadastrado ainda.</p>
            </div>
          )}
        </>
      )}

      {/* Modal: novo cartão */}
      {showCartaoForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowCartaoForm(false)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>Novo cartão</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 2 }}><label>Nome do cartão</label><input value={cNome} onChange={e => setCNome(e.target.value)} placeholder="Nubank, Inter…" /></div>
                <div style={{ flex: 1 }}><label>Bandeira</label><input value={cBandeira} onChange={e => setCBandeira(e.target.value)} placeholder="Visa" /></div>
              </div>
              <div><label>Limite (R$)</label><input type="number" value={cLimite} onChange={e => setCLimite(e.target.value)} placeholder="0,00" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Dia fechamento</label><select value={cFech} onChange={e => setCFech(e.target.value)}><option value="">—</option>{DIAS.map(d => <option key={d} value={d}>Dia {d}</option>)}</select></div>
                <div style={{ flex: 1 }}><label>Dia vencimento</label><select value={cVenc} onChange={e => setCVenc(e.target.value)}><option value="">—</option>{DIAS.map(d => <option key={d} value={d}>Dia {d}</option>)}</select></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowCartaoForm(false)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvarCartao} disabled={saving} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: novo lançamento */}
      {showLancForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowLancForm(false)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>Novo lançamento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>Cartão</label>
                {cartoes.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 12px', background: 'var(--s2)', border: '1px dashed var(--border)', borderRadius: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center' }}>Nenhum cartão cadastrado ainda.</span>
                    <button type="button" onClick={() => { setShowLancForm(false); setShowCartaoForm(true) }}
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(232,168,12,.25)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}>
                      + Cadastrar cartão
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {cartoes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setLCartaoId(c.id)}
                        style={{
                          padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          border: `2px solid ${lCartaoId === c.id ? 'var(--accent)' : 'var(--border)'}`,
                          background: lCartaoId === c.id ? 'var(--accent-dim)' : 'var(--s2)',
                          color: lCartaoId === c.id ? 'var(--accent)' : 'var(--t1)',
                          transition: 'all .12s',
                        }}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div><label>Descrição</label><input value={lDesc} onChange={e => setLDesc(e.target.value)} placeholder="Ex: Supermercado, Ingresso…" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Valor total (R$)</label><input type="number" value={lValor} onChange={e => setLValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
                <div style={{ width: 90 }}><label>Parcelas</label><select value={lParcelas} onChange={e => setLParcelas(e.target.value)}>{Array.from({ length: 24 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label>Data</label><input type="date" value={lData} onChange={e => setLData(e.target.value)} /></div>
                <div style={{ flex: 1 }}><label>Categoria</label><select value={lCat} onChange={e => setLCat(e.target.value)}><option value="">—</option>{CATS_CARTAO.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowLancForm(false)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={salvarLanc} disabled={saving || !lCartaoId || !lDesc || !lValor} className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 14 }}>{saving ? 'Salvando…' : 'Lançar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: pagar fatura */}
      {showPagarFatura && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowPagarFatura(null)}>
          <div style={{ width: '100%', background: 'var(--s1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 4 }}>Pagar fatura</h3>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>{showPagarFatura.cartao.nome} · {fmt(showPagarFatura.fatura)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label>Data do pagamento</label><input type="date" value={faturaData} onChange={e => setFaturaData(e.target.value)} /></div>
              <p style={{ fontSize: 12, color: 'var(--t3)', background: 'var(--s2)', borderRadius: 10, padding: '10px 12px' }}>
                O valor da fatura ({fmt(showPagarFatura.fatura)}) será lançado no Controle de Caixa como saída.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowPagarFatura(null)} style={{ flex: 1, padding: '13px', border: '1px solid var(--border)', background: 'var(--s2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--t2)' }}>Cancelar</button>
                <button onClick={pagarFatura} disabled={saving || !faturaData} style={{ flex: 1, padding: '13px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'var(--accent)', color: '#07090f' }}>{saving ? 'Salvando…' : 'Confirmar pagamento'}</button>
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
