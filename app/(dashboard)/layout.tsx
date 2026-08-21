import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { NavTabsDesktop, NavTabsMobile } from '@/components/NavTabs'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', user.id).single()

  return (
    <div style={{
      height: '100svh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Navbar nome={perfil?.nome ?? null} email={user.email ?? null} />
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
