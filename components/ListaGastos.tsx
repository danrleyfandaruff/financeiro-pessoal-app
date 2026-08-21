'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Caixa } from '@/lib/types'

interface Props {
  gastos: Caixa[]
  onDelete: (id: string) => void
}

export default function ListaGastos({ gastos, onDelete }: Props) {
  const [deletando, setDeletando] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    setDeletando(id)
    const supabase = createClient()
    await supabase.from('gastos').delete().eq('id', id)
    onDelete(id)
    setDeletando(null)
  }

  const fmtData = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  if (!gastos.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
        <p className="text-slate-500">Nenhum lançamento encontrado</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-3">Data</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-3">Descrição</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-3">Categoria</th>
              <th className="text-right text-xs text-slate-400 uppercase tracking-wider px-4 py-3">Valor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {gastos.map(g => (
              <tr key={g.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{fmtData(g.data)}</td>
                <td className="px-4 py-3 text-sm text-slate-100">{g.descricao || '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-indigo-950 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                    {g.categoria}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-red-400 text-right whitespace-nowrap">
                  {Number(g.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={deletando === g.id}
                    className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 text-lg leading-none"
                    title="Excluir"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
