export const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Transferência'] as const
export const PERIODICIDADES = [
  { valor: 'semanal',    label: 'Semanal' },
  { valor: 'quinzenal',  label: 'Quinzenal' },
  { valor: 'mensal',     label: 'Mensal' },
  { valor: 'bimestral',  label: 'Bimestral' },
  { valor: 'trimestral', label: 'Trimestral' },
  { valor: 'semestral',  label: 'Semestral' },
  { valor: 'anual',      label: 'Anual' },
] as const

export function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtData(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

export function primeiroDiaMes(ano?: number, mes?: number): string {
  const d = new Date()
  return `${ano ?? d.getFullYear()}-${String(mes ?? d.getMonth() + 1).padStart(2, '0')}-01`
}

export function ultimoDiaMes(ano?: number, mes?: number): string {
  const d = new Date()
  const y = ano ?? d.getFullYear()
  const m = mes ?? d.getMonth() + 1
  const last = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${last}`
}

export function menosNMeses(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

export type VencStatus = 'pago' | 'vencido' | 'hoje' | 'proximo' | 'futuro'

export function vencStatus(vencimento: string, pago: boolean): VencStatus {
  if (pago) return 'pago'
  const diff = Math.floor(
    (new Date(vencimento).getTime() - new Date(hoje()).getTime()) / 86400000
  )
  if (diff < 0) return 'vencido'
  if (diff === 0) return 'hoje'
  if (diff <= 7) return 'proximo'
  return 'futuro'
}

export function vencLabel(vencimento: string, pago: boolean): string {
  const s = vencStatus(vencimento, pago)
  const diff = Math.floor(
    (new Date(vencimento).getTime() - new Date(hoje()).getTime()) / 86400000
  )
  if (s === 'pago')    return 'Pago'
  if (s === 'vencido') return `${Math.abs(diff)}d atrasado`
  if (s === 'hoje')    return 'Hoje'
  if (s === 'proximo') return `${diff}d`
  return fmtData(vencimento)
}

export function vencColor(status: VencStatus): string {
  return {
    pago:    'bg-emerald-950 text-emerald-300',
    vencido: 'bg-red-950 text-red-300',
    hoje:    'bg-orange-950 text-orange-300',
    proximo: 'bg-yellow-950 text-yellow-300',
    futuro:  'bg-slate-800 text-slate-300',
  }[status]
}

export function progressoParcelas(pagas: number, total: number | null) {
  if (!total) return 0
  return Math.min(100, Math.round((pagas / total) * 100))
}
