'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Caixa } from '@/lib/types'

const CORES = ['#E8A80C','#0D9965','#3B82F6','#8B5CF6','#F59E0B','#EC4899','#14B8A6','#64748B','#F97316','#6366F1']

interface Props {
  gastos: Caixa[]
  tipo: 'entrada' | 'saida'
  title: string
}

const fmtBrl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GraficoPizza({ gastos, tipo, title }: Props) {
  const filtered = gastos.filter(g => g.tipo === tipo)
  if (!filtered.length) return null

  const porCat: Record<string, number> = {}
  filtered.forEach(g => { porCat[g.categoria || 'Sem categoria'] = (porCat[g.categoria || 'Sem categoria'] || 0) + Number(g.valor) })
  const data = Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

  return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 16px', flex: 1, minWidth: 0, boxShadow: '0 1px 4px rgba(15,22,41,.04)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
            {data.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--t1)' }}
            formatter={(v: number) => [fmtBrl(v), '']}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--t2)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
