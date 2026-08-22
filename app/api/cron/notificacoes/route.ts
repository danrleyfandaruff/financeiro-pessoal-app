import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Amanhã no formato YYYY-MM-DD
function amanha(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string) {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

// Monta tabela HTML de itens
function tabelaHtml(itens: { descricao: string; valor: number; data: string }[]) {
  const linhas = itens.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i.descricao}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmtValor(i.valor)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${fmtData(i.data)}</td>
    </tr>`).join('')
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;">Descrição</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;">Valor</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;color:#6b7280;">Vencimento</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`
}

function emailHtml(nome: string, secoes: { titulo: string; cor: string; itens: { descricao: string; valor: number; data: string }[] }[]) {
  const secoesHtml = secoes.map(s => `
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:12px;height:12px;border-radius:3px;background:${s.cor};"></div>
        <span style="font-weight:700;font-size:15px;color:#111827;">${s.titulo}</span>
        <span style="font-size:13px;color:#6b7280;">(${s.itens.length} item${s.itens.length > 1 ? 's' : ''})</span>
      </div>
      ${tabelaHtml(s.itens)}
    </div>`).join('')

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><title>Vencimentos amanhã</title></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:#0F1629;padding:28px 32px;display:flex;align-items:center;gap:12px;">
          <div style="display:flex;align-items:flex-end;gap:4px;height:24px;">
            <div style="width:5px;height:10px;background:#3D5270;border-radius:2px;"></div>
            <div style="width:5px;height:15px;background:#E8A80C;border-radius:2px;"></div>
            <div style="width:5px;height:19px;background:#E8A80C;border-radius:2px;"></div>
            <div style="width:5px;height:24px;background:#ffffff;border-radius:2px;"></div>
          </div>
          <span style="color:#ffffff;font-size:18px;font-weight:700;">Restarta Finance</span>
        </div>

        <!-- Body -->
        <div style="padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
            Olá, ${nome}! 👋
          </p>
          <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
            Você tem compromissos financeiros vencendo <strong>amanhã</strong>. Acesse o app para não perder o prazo.
          </p>

          ${secoesHtml}

          <a href="https://restarta-finance.vercel.app"
            style="display:block;margin-top:28px;padding:14px;background:#E8A80C;color:#0F1629;text-align:center;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Abrir Restarta Finance
          </a>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Você recebe este email porque tem uma conta no Restarta Finance.<br>
            <a href="https://restarta-finance.vercel.app/perfil" style="color:#9ca3af;">Gerenciar notificações</a>
          </p>
        </div>
      </div>
    </body>
    </html>`
}

export async function GET(request: Request) {
  // Segurança: valida o secret do cron
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = amanha()
  const enviados: string[] = []
  const erros: string[] = []

  // ── 1. Busca todos os itens que vencem amanhã ─────────────────────────────

  const [pjPagar, pjReceber, pfDespesas, pfReceitas] = await Promise.all([
    supabase.from('contas_pagar').select('*').eq('vencimento', data).eq('pago', false),
    supabase.from('contas_receber').select('*').eq('vencimento', data).eq('pago', false),
    supabase.rpc('cron_despesas_vencendo', { data_alvo: data }),
    supabase.from('pf_receitas').select('*').eq('data_prevista', data).eq('status', 'pendente'),
  ])

  // ── 2. Agrupa por user_id ─────────────────────────────────────────────────

  type Item = { descricao: string; valor: number; data: string }
  type UsuarioItens = { pjPagar: Item[]; pjReceber: Item[]; pfDespesas: Item[]; pfReceitas: Item[] }
  const porUsuario = new Map<string, UsuarioItens>()

  function addItem(userId: string, campo: keyof UsuarioItens, item: Item) {
    if (!porUsuario.has(userId)) {
      porUsuario.set(userId, { pjPagar: [], pjReceber: [], pfDespesas: [], pfReceitas: [] })
    }
    porUsuario.get(userId)![campo].push(item)
  }

  pjPagar.data?.forEach(r => addItem(r.user_id, 'pjPagar',    { descricao: r.descricao, valor: Number(r.valor), data: r.vencimento }))
  pjReceber.data?.forEach(r => addItem(r.user_id, 'pjReceber', { descricao: r.descricao, valor: Number(r.valor), data: r.vencimento }))
  ;(pfDespesas.data as any[])?.forEach((r: any) => addItem(r.user_id, 'pfDespesas', { descricao: r.nome, valor: Number(r.valor), data: r.data_prevista }))
  pfReceitas.data?.forEach(r => addItem(r.user_id, 'pfReceitas', { descricao: r.nome,      valor: Number(r.valor), data: r.data_prevista }))

  if (porUsuario.size === 0) {
    return NextResponse.json({ ok: true, msg: 'Nenhum vencimento amanhã', data })
  }

  // ── 3. Busca emails dos usuários ──────────────────────────────────────────

  const userIds = Array.from(porUsuario.keys())
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const emailPorId = new Map(users.map(u => [u.id, { email: u.email!, nome: u.user_metadata?.['nome'] || u.user_metadata?.['full_name'] || 'você' }]))

  // ── 4. Envia emails ───────────────────────────────────────────────────────

  for (const userId of userIds) {
    const info = emailPorId.get(userId)
    if (!info?.email) continue

    const itens = porUsuario.get(userId)!
    const secoes = [
      { titulo: 'Contas a pagar (Empresa)',   cor: '#ef4444', itens: itens.pjPagar    },
      { titulo: 'Contas a receber (Empresa)', cor: '#22c55e', itens: itens.pjReceber  },
      { titulo: 'Despesas pessoais',          cor: '#f97316', itens: itens.pfDespesas },
      { titulo: 'Receitas esperadas',         cor: '#3b82f6', itens: itens.pfReceitas },
    ].filter(s => s.itens.length > 0)

    const totalItens = secoes.reduce((acc, s) => acc + s.itens.length, 0)

    try {
      await resend.emails.send({
        from: 'Restarta Finance <onboarding@resend.dev>',
        to: info.email,
        subject: `⏰ ${totalItens} vencimento${totalItens > 1 ? 's' : ''} amanhã — Restarta Finance`,
        html: emailHtml(info.nome, secoes),
      })
      enviados.push(info.email)
    } catch (err: any) {
      erros.push(`${info.email}: ${err.message}`)
    }
  }

  return NextResponse.json({ ok: true, data, enviados: enviados.length, erros })
}
