import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Navbar from '@/components/Navbar'
import { NavTabsDesktop, NavTabsMobile } from '@/components/NavTabs'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfis').select('nome,tipo_conta').eq('id', user.id).single()

  // fallback: lê do user_metadata caso a migration ainda não tenha rodado
  const tipo = (perfil?.tipo_conta ?? user.user_metadata?.tipo_conta ?? 'PJ') as string

  // usuário só tem PF → manda pro módulo PF
  if (tipo === 'PF') redirect('/pf')

  // usuário tem os dois → verifica o cookie de escolha
  if (tipo === 'AMBOS') {
    const cookieStore = await cookies()
    const contaAtiva = cookieStore.get('conta-ativa')?.value
    if (contaAtiva !== 'PJ') redirect('/selecionar-conta')
  }

  return (
    <div style={{
      height: '100svh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Navbar nome={perfil?.nome ?? null} email={user.email ?? null} contaAtiva="PJ" tipoUsuario={tipo as 'PJ' | 'PF' | 'AMBOS'} />
      <NavTabsDesktop />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as any,
      }}>
        <div style={{
          maxWidth: 1152,
          margin: '0 auto',
          padding: '20px 16px 28px',
        }}>
          {children}
        </div>
      </main>
      <NavTabsMobile />
    </div>
  )
}
