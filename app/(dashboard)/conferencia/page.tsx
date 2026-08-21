'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtData } from '@/lib/utils'
import type { Inconsistencia } from '@/lib/types'

export default function ConferenciaPage() {
  const supabase = createClient()
  const [itens, setItens] = useState<Inconsistencia[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('conferencia_inconsistencias').select('*').order('data', { ascending: false })
    setItens((data as Inconsistencia[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-slate-100">Conferência de caixa</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Contas marcadas como pagas sem registro correspondente no caixa
          </p>
        </div>
        <button onClick={load} className="text-sm text-slate-400 hover:text-slate-100 px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-slate-300 font-medium">Nenhuma inconsistência detectada</div>
          <div className="text-sm text-slate-500 mt-1">O caixa está coerente com os títulos financeiros</div>
        </div>
      ) : (
        <>
          <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-4 mb-5 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-medium text-yellow-200">{itens.length} inconsistência{itens.length > 1 ? 's' : ''} detectada{itens.length > 1 ? 's' : ''}</div>
              <div className="text-sm text-yellow-400 mt-0.5">Estas contas foram marcadas como pagas mas não geraram lançamento no caixa.</div>
            </div>
          </div>
          <div className="space-y-3">
            {itens.map(i => (
              <div key={i.id_referencia} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${i.tipo === 'conta_pagar' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                  {i.tipo === 'conta_pagar' ? '⬆️' : '⬇️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-100">{i.descricao}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {i.tipo === 'conta_pagar' ? 'Conta a pagar' : 'Conta a receber'}
                    {i.data ? ` · Pago em ${fmtData(i.data)}` : ''}
                  </div>
                </div>
                <div className="text-lg font-bold text-slate-200 flex-shrink-0">{fmt(Number(i.valor))}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
