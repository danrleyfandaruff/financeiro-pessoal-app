'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { Gasto } from '@/lib/types'

interface Props {
  gastos: Gasto[]
}

const CORES = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#60a5fa', '#34d399',
  '#fbbf24', '#f87171', '#fb923c', '#e879f9', '#2dd4bf',
  '#94a3b8', '#475569',
]

export default function GraficoCategorias({ gastos }: Props) {
  const porCategoria: Record<string, number> = {}
  gastos.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.valor)
  })

  const data = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([categoria, total]) => ({ categoria, total }))

  if (!data.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 flex items-center justify-center h-40">
        <p className="text-slate-500 text-sm">Nenhum dado para exibir</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Por categoria
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="categoria"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
            formatter={(v: number) => [
              v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              'Total',
            ]}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CORES[i % CORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
