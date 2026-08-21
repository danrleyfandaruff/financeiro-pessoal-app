'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtData, hoje, PERIODICIDADES } from '@/lib/utils'
import type { Recorrencia, ContaPagar } from '@/lib/types'
import Modal from '@/components/shared/Modal'
import ConfirmModal from '@/components/ConfirmModal'

export default function RecorrenciasPage() {
  const supabase = createClient()
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [parcelas, setParcelas] = useState<Record<string, ContaPagar[]>>({})
  const [expandido, setExpandido] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  const [dlg, setDlg] = useState<{ msg: string; onOk: () => void; confirmLabel?: string; danger?: boolean } | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const [fTipo, setFTipo] = useState<'entrada' | 'saida'>('saida')
  const [fDesc, setFDesc] = useState('')
  const [fValor, setFValor] = useState('')
  const [fTotal, setFTotal] = useState('')
  const [fPeriod, setFPeriod] = useState('mensal')
  const [fInicio, setFInicio] = useState(hoje())
  const [fCat, setFCat] = useState('')
  const [fObs, setFObs] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('recorrencias').select('*').order('criado_em', { ascending: false })
    const recs = (data as Recorrencia[]) || []

    // Buscar parcelas de cada recorrência
    const ids = recs.map(r => r.id)
    if (ids.length > 0) {
      const { data: parts } = await supabase.from('contas_pagar')
        .select('*').in('id_recorrencia', ids).order('vencimento')
      const byRec: Record<string, ContaPagar[]> = {}
      ;(parts as ContaPagar[] || []).forEach(p => {
        if (!byRec[p.id_recorrencia!]) byRec[p.id_recorrencia!] = []
        byRec[p.id_recorrencia!].push(p)
      })
      setParcelas(byRec)
    }
    setRecorrencias(recs)
    const { data: cats } = await supabase.from('categorias').select('nome').order('nome')
    setCategorias((cats || []).map((c: { nome: string }) => c.nome))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      user_id: user!.id, tipo: fTipo, descricao: fDesc.trim(),
      valor_parcela: parseFloat(fValor.replace(',', '.')),
      total_parcelas: fTotal ? parseInt(fTotal) : null,
      periodicidade: fPeriod, data_inicio: fInicio,
      categoria: fCat || null, observacoes: fObs.trim() || null,
    }
    const { data: rec } = await supabase.from('recorrencias').insert(payload).select().single()
    if (rec) {
      // Gera a primeira parcela automaticamente
      await supabase.rpc('gerar_proxima_parcela', { p_rec_id: rec.id })
    }
    setSaving(false); setShowForm(false); load()
  }

  async function gerarParcela(recId: string) {
    setGerandoId(recId)
    const { error } = await supabase.rpc('gerar_proxima_parcela', { p_rec_id: recId })
    if (error) setErrMsg(error.message)
    setGerandoId(null)
    load()
  }

  function cancelar(id: string) {
    setDlg({
      msg: 'Tem certeza que deseja cancelar esta recorrência? Os lançamentos já gerados serão mantidos.',
      confirmLabel: 'Cancelar recorrência',
      danger: false,
      onOk: async () => {
        await supabase.from('recorrencias').update({ cancelado: true }).eq('id', id)
        load()
      },
    })
  }

  return (
    <div>
      {errMsg && (
        <div style={{ background: 'rgba(251,113,133,.1)', border: '1px solid rgba(251,113,133,.3)', color: 'var(--rose)', borderRadius: 12, padding: '10px 14px', fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errMsg}</span>
          <button onClick={() => setErrMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}
      {showForm && (
        <Modal title="Nova recorrência / parcelamento" onClose={() => setShowForm(false)}>
          <form onSubmit={salvar} className="space-y-4">
            <div className="flex gap-3">
              {(['saida','entrada'] as const).map(t => (
                <button key={t} type="button" onClick={() => setFTipo(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                    ${fTipo === t ? (t === 'entrada' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-slate-800 text-slate-300'}`}>
                  {t === 'entrada' ? '↓ Recebimento' : '↑ Pagamento'}
                </button>
              ))}
            </div>
            <div><label>Descrição</label><input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Ex: Aluguel, financiamento..." required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label>Valor por parcela</label><input inputMode="decimal" value={fValor} onChange={e => setFValor(e.target.value)} required /></div>
              <div><label>Total de parcelas <span className="text-slate-500">(vazio = fixo)</span></label><input type="number" value={fTotal} onChange={e => setFTotal(e.target.value)} min="1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label>Periodicidade</label>
                <select value={fPeriod} onChange={e => setFPeriod(e.target.value)}>
                  {PERIODICIDADES.map(p => <option key={p.valor} value={p.valor}>{p.label}</option>)}
                </select>
              </div>
              <div><label>Data de início</label><input type="date" value={fInicio} onChange={e => setFInicio(e.target.value)} required /></div>
            </div>
            <div>
              <label>Categoria</label>
              <select value={fCat} onChange={e => setFCat(e.target.value)}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
              {saving ? 'Salvando...' : 'Criar recorrência'}
            </button>
          </form>
        </Modal>
      )}

      <div className="flex justify-end mb-5">
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nova recorrência
        </button>
      </div>

      {loading ? <div className="text-center py-20 text-slate-500">Carregando...</div> : (
        <div className="space-y-4">
          {recorrencias.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <div className="text-4xl mb-3">🗓️</div>
              Nenhuma recorrência cadastrada
            </div>
          )}
          {recorrencias.map(r => {
            const parts = parcelas[r.id] || []
            const pagas = parts.filter(p => p.pago).length
            const pct = r.total_parcelas ? Math.round((pagas / r.total_parcelas) * 100) : 0
            const concluido = r.total_parcelas ? pagas >= r.total_parcelas : false
            const proxima = parts.find(p => !p.pago)

            return (
              <div key={r.id} className={`bg-slate-900 border rounded-xl overflow-hidden ${r.cancelado ? 'border-slate-800 opacity-60' : 'border-slate-700'}`}>
                {/* Cabeçalho */}
                <div className="p-4 cursor-pointer" onClick={() => setExpandido(expandido === r.id ? null : r.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg
                      ${concluido ? 'bg-emerald-950 text-emerald-400' : r.cancelado ? 'bg-slate-800 text-slate-400' : r.tipo === 'saida' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                      {concluido ? '✓' : r.cancelado ? '×' : '↻'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-100">{r.descricao}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {fmt(r.valor_parcela)}/parcela ·{' '}
                        {PERIODICIDADES.find(p => p.valor === r.periodicidade)?.label}
                        {r.categoria ? ` · ${r.categoria}` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-slate-100">{r.total_parcelas ? `${pagas}/${r.total_parcelas}` : `${pagas} pagas`}</div>
                      {r.total_parcelas && <div className="text-xs text-slate-400">{fmt(r.valor_parcela * r.total_parcelas)}</div>}
                    </div>
                    <span className="text-slate-500 ml-2">{expandido === r.id ? '▲' : '▼'}</span>
                  </div>

                  {/* Barra de progresso */}
                  {r.total_parcelas && (
                    <div className="mt-3 bg-slate-800 rounded-full h-1.5">
                      <div className={`h-full rounded-full transition-all ${concluido ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}

                  {/* Info resumida */}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    {!concluido && !r.cancelado && proxima && (
                      <span className="text-slate-400">Próxima: {fmtData(proxima.vencimento)}</span>
                    )}
                    {concluido && <span className="text-emerald-400">✓ Quitado</span>}
                    {r.cancelado && <span className="text-slate-400">× Cancelado</span>}
                    {!r.cancelado && !concluido && (
                      <div className="ml-auto flex gap-2">
                        <button onClick={e => { e.stopPropagation(); gerarParcela(r.id) }}
                          disabled={gerandoId === r.id}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50">
                          {gerandoId === r.id ? '...' : '+ Gerar parcela'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); cancelar(r.id) }}
                          className="bg-slate-700 hover:bg-red-950 text-slate-300 hover:text-red-300 px-2 py-1 rounded text-xs">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parcelas expandidas */}
                {expandido === r.id && (
                  <div className="border-t border-slate-800">
                    {parts.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Nenhuma parcela gerada</div>
                    ) : parts.map(p => (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/50 last:border-0 ${p.pago ? 'opacity-60' : ''}`}>
                        <span className="text-xs text-slate-400 w-6">{p.numero_parcela}</span>
                        <span className="text-sm text-slate-300 flex-1">{fmtData(p.vencimento)}</span>
                        {p.pago && p.forma_pagamento && <span className="text-xs text-slate-500">{p.forma_pagamento}</span>}
                        <span className="text-sm font-medium text-slate-200">{fmt(Number(p.valor))}</span>
                        {p.pago
                          ? <span className="text-emerald-400 text-lg">✓</span>
                          : <span className="text-xs text-slate-500">Pendente</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {dlg && (
        <ConfirmModal
          message={dlg.msg}
          confirmLabel={dlg.confirmLabel ?? 'Confirmar'}
          danger={dlg.danger ?? true}
          onConfirm={() => { dlg.onOk(); setDlg(null) }}
          onCancel={() => setDlg(null)}
        />
      )}
    </div>
  )
}
