'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS } from '@/lib/categorias'

export default function NovoGastoPage() {
  const router = useRouter()
  const hoje = new Date().toISOString().split('T')[0]

  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<string>('Alimentação')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(hoje)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const valorNum = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('gastos').insert({
      user_id: user!.id,
      valor: valorNum,
      categoria,
      descricao: descricao.trim() || null,
      data,
    })

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-slate-400 hover:text-slate-100 transition-colors">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold text-slate-100">Novo gasto</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        {erro && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        <div>
          <label>Valor (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="0,00"
            required
          />
        </div>

        <div>
          <label>Categoria</label>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          >
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label>Descrição <span className="text-slate-500">(opcional)</span></label>
          <input
            type="text"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Ex: almoço no restaurante"
          />
        </div>

        <div>
          <label>Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 text-center py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
