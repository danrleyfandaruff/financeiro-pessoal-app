import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { NavTabsPFDesktop, NavTabsPFMobile } from '@/components/NavTabsPF'

export default async function PFLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfis').select('nome,tipo_conta').eq('id', user.id).single()
  const tipo = (perfil?.tipo_conta ?? user.user_metadata?.tipo_conta ?? 'PJ') as string
  if (tipo === 'PJ') redirect('/')

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <Navbar nome={perfil?.nome ?? null} email={user.email ?? null} contaAtiva="PF" />
      <NavTabsPFDesktop />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as any }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '20px 16px 28px' }}>
          {children}
        </div>
      </main>
      <NavTabsPFMobile />
    </div>
  )
}
