'use client'
import { useState } from 'react'
import Modal from './Modal'
import { FORMAS_PAGAMENTO, hoje } from '@/lib/utils'

interface Props {
  title: string
  descricao: string
  valor: number
  onConfirm: (data: string, forma: string) => Promise<void>
  onClose: () => void
}

export default function BaixaModal({ title, descricao, valor, onConfirm, onClose }: Props) {
  const [data, setData] = useState(hoje())
  const [forma, setForma] = useState('PIX')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onConfirm(data, forma)
    setLoading(false)
    onClose()
  }

  const vFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="mb-4 p-3 bg-slate-800 rounded-lg text-sm">
        <div className="text-slate-400">Conta</div>
        <div className="font-medium text-slate-100 mt-0.5">{descricao}</div>
        <div className="text-lg font-bold text-slate-100 mt-1">{vFmt}</div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Data do pagamento</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} required />
        </div>
        <div>
          <label>Forma de pagamento</label>
          <select value={forma} onChange={e => setForma(e.target.value)}>
            {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Processando...' : 'Confirmar baixa'}
        </button>
      </form>
    </Modal>
  )
}
