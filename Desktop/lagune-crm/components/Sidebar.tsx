'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isAdmin = profile.role === 'admin'
  const isManager = profile.role === 'manager' || isAdmin

  const navItems = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/dashboard/leads', icon: '👥', label: 'Leads' },
    ...(isManager ? [{ href: '/dashboard/equipe', icon: '📈', label: 'Vue Équipe' }] : []),
    ...(isAdmin ? [
      { href: '/dashboard/import', icon: '📥', label: 'Import Excel' },
      { href: '/dashboard/users', icon: '⚙️', label: 'Utilisateurs' },
    ] : []),
  ]

  const roleLabel = { admin: 'Administrateur', manager: 'Manager', commercial: 'Commercial' }[profile.role]

  return (
    <div style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px',
      background: '#0a1a26', display: 'flex', flexDirection: 'column',
      zIndex: 100, fontFamily: 'Outfit, sans-serif'
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '20px' }}>🌊</div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '19px', fontWeight: 600, color: 'white', lineHeight: 1.1, marginTop: '4px' }}>
          Lagune Grande
        </h1>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Sidi Rahal
        </span>
      </div>

      {/* User */}
      <div style={{ margin: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: profile.color || '#2a7a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {profile.nom[0]}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>{profile.nom}</div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: profile.role === 'admin' ? '#e8c97a' : profile.role === 'manager' ? '#3a9aaa' : '#7ac9aa' }}>
            {roleLabel}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 12px', flex: 1 }}>
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <div key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', marginBottom: '2px',
                cursor: 'pointer', fontSize: '13.5px', fontWeight: 500,
                background: active ? 'rgba(42,122,138,0.3)' : 'transparent',
                color: active ? '#3a9aaa' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={logout} style={{
          width: '100%', padding: '10px', background: 'rgba(224,90,58,0.1)',
          color: 'rgba(224,90,58,0.7)', border: '1px solid rgba(224,90,58,0.2)',
          borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '13px',
          cursor: 'pointer'
        }}>
          🚪 Déconnexion
        </button>
      </div>
    </div>
  )
}
