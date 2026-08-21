'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtData, vencStatus, vencLabel, vencColor } from '@/lib/utils'
import type { ContaPagar, ContaReceber } from '@/lib/types'
import BaixaModal from '@/components/shared/BaixaModal'

type Conta = ContaPagar | ContaReceber

interface Props {
  contas: Conta[]
  tipo: 'pagar' | 'receber'
  onRefresh: () => void
  onEdit: (conta: Conta) => void
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  pago:    { bg: 'rgba(52,211,153,.1)',  color: 'var(--emerald)' },
  vencido: { bg: 'rgba(251,113,133,.1)', color: 'var(--rose)' },
  hoje:    { bg: 'rgba(240,180,41,.1)',  color: 'var(--accent)' },
  proximo: { bg: 'rgba(240,180,41,.06)', color: 'var(--accent)' },
  futuro:  { bg: 'rgba(129,151,184,.1)', color: 'var(--t2)' },
}

export default function ListaContas({ contas, tipo, onRefresh, onEdit }: Props) {
  const supabase = createClient()
  const [baixaItem, setBaixaItem] = useState<Conta | null>(null)

  async function darBaixa(data: string, forma: string) {
    const fn = tipo === 'pagar' ? 'dar_baixa_conta_pagar' : 'dar_baixa_conta_receber'
    await supabase.rpc(fn, { p_conta_id: baixaItem!.id, p_data: data, p_forma: forma })
    onRefresh()
  }

  async function desfazerBaixa(c: Conta) {
    if (!confirm('Desfazer o pagamento? O lançamento no caixa será removido.')) return
    const fn = tipo === 'pagar' ? 'desfazer_baixa_conta_pagar' : 'desfazer_baixa_conta_receber'
    await supabase.rpc(fn, { p_conta_id: c.id })
    onRefresh()
  }

  async function excluir(c: Conta) {
    if (!confirm('Excluir esta conta?')) return
    const tbl = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber'
    await supabase.from(tbl).delete().eq('id', c.id)
    onRefresh()
  }

  const dataField = (c: Conta) => tipo === 'pagar'
    ? (c as ContaPagar).data_pagamento
    : (c as ContaReceber).data_recebimento

  return (
    <>
      {baixaItem && (
        <BaixaModal
          title={tipo === 'pagar' ? 'Dar baixa — Conta a Pagar' : 'Dar baixa — Conta a Receber'}
          descricao={baixaItem.descricao}
          valor={Number(baixaItem.valor)}
          onConfirm={darBaixa}
          onClose={() => setBaixaItem(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {contas.length === 0 ? (
          <div style={{
            background: 'var(--s1)', border: '1px solid var(--border)',
            borderRadius: 18, textAlign: 'center', padding: '40px 0',
            color: 'var(--t3)', fontSize: 14,
          }}>
            Nenhuma conta cadastrada
          </div>
        ) : contas.map(c => {
          const status = vencStatus(c.vencimento, c.pago)
          const st = statusStyle[status] || statusStyle.futuro
          const dataP = dataField(c)
          const cor = tipo === 'pagar' ? 'var(--rose)' : 'var(--emerald)'

          return (
            <div key={c.id} style={{
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              opacity: c.pago ? .6 : 1,
              transition: 'opacity .15s',
            }}>
              {/* Status badge */}
              <div style={{
                ...st,
                borderRadius: 8,
                padding: '4px 9px',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                marginTop: 2,
              }}>
                {vencLabel(c.vencimento, c.pago)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.descricao}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 3 }}>
                  Venc. {fmtData(c.vencimento)}
                  {c.categoria ? ` · ${c.categoria}` : ''}
                  {c.pago && dataP ? ` · Pago em ${fmtData(dataP)}` : ''}
                  {c.pago && c.forma_pagamento ? ` via ${c.forma_pagamento}` : ''}
                </div>
              </div>

              {/* Valor */}
              <div style={{ fontSize: 17, fontWeight: 800, flexShrink: 0, color: cor }} className="tabular">
                {fmt(Number(c.valor))}
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={() => onEdit(c)} title="Editar"
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--t2)' }}>
                    ✏️
                  </button>
                  <button onClick={() => excluir(c)} title="Excluir"
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--t2)' }}>
                    🗑️
                  </button>
                </div>
                {!c.pago && (
                  <button onClick={() => setBaixaItem(c)} title="Dar baixa"
                    style={{
                      height: 32, borderRadius: 8,
                      background: tipo === 'pagar' ? 'var(--rose-dim)' : 'var(--emerald-dim)',
                      border: `1px solid ${tipo === 'pagar' ? 'rgba(251,113,133,.3)' : 'rgba(52,211,153,.3)'}`,
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      color: cor, padding: '0 10px',
                    }}>
                    ✓ Baixa
                  </button>
                )}
                {c.pago && (
                  <button onClick={() => desfazerBaixa(c)} title="Desfazer baixa"
                    style={{
                      height: 32, borderRadius: 8,
                      background: 'var(--accent-dim)',
                      border: '1px solid rgba(240,180,41,.3)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: 'var(--accent)', padding: '0 8px',
                    }}>
                    ↩ Desfazer
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
