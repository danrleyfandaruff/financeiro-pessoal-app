'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { EvolucaoMensal } from '@/lib/types'

interface Props { data: EvolucaoMensal[] }

const fmtMes = (s: string) => {
  const [y, m] = s.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[+m - 1]}/${y.slice(2)}`
}

const fmtBrl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GraficoMensal({ data }: Props) {
  if (!data.length) return null

  return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 16px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 16 }}>
        Evolução mensal
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} barGap={3} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1f2f4a" vertical={false} />
          <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fill: '#3A5070', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#3A5070', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,.03)' }}
            contentStyle={{ background: '#0d1220', border: '1px solid #1f2f4a', borderRadius: 12, fontSize: 13 }}
            formatter={(v: number, name: string) => [fmtBrl(v), name === 'entradas' ? 'Entradas' : 'Saídas']}
            labelFormatter={fmtMes}
          />
          <Legend
            formatter={v => v === 'entradas' ? 'Entradas' : 'Saídas'}
            wrapperStyle={{ fontSize: 12, color: '#8097B8', paddingTop: 8 }}
          />
          <Bar dataKey="entradas" fill="#34D399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="saidas"   fill="#FB7185" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
