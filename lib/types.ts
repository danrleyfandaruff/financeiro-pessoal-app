export type TipoCaixa = 'entrada' | 'saida'
export type FormaPagamento = 'PIX' | 'Dinheiro' | 'Cartão Débito' | 'Cartão Crédito' | 'Transferência'
export type TipoCategoria = 'entrada' | 'saida' | 'ambos'
export type Periodicidade = 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

export type TipoConta = 'PJ' | 'PF' | 'AMBOS'

export interface Perfil {
  id: string
  nome: string | null
  tipo_conta: TipoConta
}

/* ── Pessoa Física ──────────────────────────────────────── */

export interface PfReceita {
  id: string
  user_id: string
  nome: string
  valor: number
  dia_recebimento: number | null
  ativa: boolean
  criado_em: string
}

export interface PfDespesa {
  id: string
  user_id: string
  nome: string
  valor: number
  dia_vencimento: number | null
  categoria: string | null
  ativa: boolean
  criado_em: string
}

export interface PfCartao {
  id: string
  user_id: string
  nome: string
  bandeira: string | null
  limite: number
  dia_fechamento: number
  dia_vencimento: number
  cor: string | null
  criado_em: string
}

export interface PfLancamentoCartao {
  id: string
  user_id: string
  cartao_id: string
  descricao: string
  categoria: string | null
  valor: number
  data: string
  parcelas: number
  parcela_atual: number
  criado_em: string
}

export interface PfMeta {
  id: string
  user_id: string
  nome: string
  valor_meta: number
  valor_atual: number
  prazo: string | null
  categoria: string | null
  cor: string | null
  criado_em: string
}

export interface Categoria {
  id: string
  user_id: string
  nome: string
  tipo: TipoCategoria
}

export interface Caixa {
  id: string
  user_id: string
  tipo: TipoCaixa
  descricao: string
  valor: number
  data: string
  categoria: string | null
  forma_pagamento: FormaPagamento | null
  observacoes: string | null
  origem: string | null
  criado_em: string
}

export interface ContaPagar {
  id: string
  user_id: string
  descricao: string
  valor: number
  vencimento: string
  categoria: string | null
  pago: boolean
  data_pagamento: string | null
  forma_pagamento: string | null
  id_caixa: string | null
  id_recorrencia: string | null
  numero_parcela: number | null
  observacoes: string | null
  criado_em: string
}

export interface ContaReceber {
  id: string
  user_id: string
  descricao: string
  valor: number
  vencimento: string
  categoria: string | null
  pago: boolean
  data_recebimento: string | null
  forma_pagamento: string | null
  id_caixa: string | null
  observacoes: string | null
  criado_em: string
}

export interface Recorrencia {
  id: string
  user_id: string
  tipo: TipoCaixa
  descricao: string
  valor_parcela: number
  total_parcelas: number | null
  periodicidade: Periodicidade
  data_inicio: string
  categoria: string | null
  cancelado: boolean
  observacoes: string | null
  criado_em: string
  // computed
  parcelas_geradas?: number
  parcelas_pagas?: number
  proxima_vencimento?: string | null
}

export interface Patrimonio {
  id: string
  user_id: string
  nome: string
  descricao: string | null
  valor: number
  data_aquisicao: string
  categoria: string | null
  id_caixa: string | null
  criado_em: string
}

export interface EvolucaoMensal {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

export interface Inconsistencia {
  tipo: 'conta_pagar' | 'conta_receber'
  id_referencia: string
  descricao: string
  valor: number
  data: string | null
}
