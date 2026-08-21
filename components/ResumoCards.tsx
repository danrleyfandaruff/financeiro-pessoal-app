import type { Caixa } from '@/lib/types'

interface Props {
  gastos: Caixa[]
}

export default function ResumoCards({ gastos }: Props) {
  const total = gastos.reduce((s, g) => s + Number(g.valor), 0)
  const maior = gastos.reduce((m, g) => Number(g.valor) > m ? Number(g.valor) : m, 0)

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total do período</p>
        <p className="text-2xl font-bold text-red-400">{fmt(total)}</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Lançamentos</p>
        <p className="text-2xl font-bold text-blue-400">{gastos.length}</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Maior gasto</p>
        <p className="text-2xl font-bold text-slate-100">{maior ? fmt(maior) : '—'}</p>
      </div>
    </div>
  )
}
