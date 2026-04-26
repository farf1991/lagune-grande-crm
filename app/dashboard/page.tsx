import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { STATUT_COLORS, SOURCE_COLORS } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single()

  const isManager = profile?.role === 'admin' || profile?.role === 'manager'

  let query = supabase.from('leads').select('*')
  if (!isManager) query = query.eq('assigne_id', session!.user.id)
  const { data: leads = [] } = await query

  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const relancesAujourdhui = leads!.filter(l => l.relance_date && new Date(l.relance_date) <= todayEnd)
  const vendus = leads!.filter(l => l.statut === 'Vendu').length
  const chauds = leads!.filter(l => l.statut === 'Chaud').length
  const rdv = leads!.filter(l => l.statut === 'RDV Planifié' || l.statut === 'RDV Fait').length
  const total = leads!.length

  // Stats par statut
  const statutCounts: Record<string, number> = {}
  leads!.forEach(l => { statutCounts[l.statut] = (statutCounts[l.statut] || 0) + 1 })
  const sourceCounts: Record<string, number> = {}
  leads!.forEach(l => { sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1 })

  const maxStatut = Math.max(...Object.values(statutCounts), 1)
  const maxSource = Math.max(...Object.values(sourceCounts), 1)

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Outfit,sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '26px', fontWeight: 600, color: '#1a3a4a' }}>
          Bonjour {profile?.nom?.split(' ')[0]} 👋
        </h2>
        <p style={{ fontSize: '13px', color: '#9a9a9a', marginTop: '2px' }}>Lagune Grande Sidi Rahal — Dashboard</p>
      </div>

      {/* Relances banner */}
      {relancesAujourdhui.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#fff8e8,#fff3d4)', border: '1.5px solid #c9a84c', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '24px' }}>🔔</span>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a3a4a' }}>{relancesAujourdhui.length} relance{relancesAujourdhui.length > 1 ? 's' : ''} aujourd&apos;hui</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {relancesAujourdhui.map(l => {
                const late = new Date(l.relance_date) < now
                return (
                  <a key={l.id} href={`/dashboard/leads?open=${l.id}`} style={{
                    background: 'white', border: `1px solid ${late ? '#e05a3a' : '#c9a84c'}`,
                    borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                    color: late ? '#e05a3a' : '#1a3a4a', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}>
                    {late ? '⚠️' : '📞'} {l.nom}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total leads', val: total, emoji: '👥', color: '#1a3a4a' },
          { label: 'Leads chauds', val: chauds, emoji: '🔥', color: '#d4852a' },
          { label: 'RDV', val: rdv, emoji: '📅', color: '#2a7a8a' },
          { label: 'Vendus', val: vendus, emoji: '🏠', color: '#2d8a5e' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)', boxShadow: '0 2px 12px rgba(26,58,74,0.06)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: kpi.color }} />
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>{kpi.emoji}</div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '36px', fontWeight: 600, color: '#1a3a4a', lineHeight: 1 }}>{kpi.val}</div>
            <div style={{ fontSize: '11px', color: '#9a9a9a', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Pipeline statuts</h4>
          {Object.entries(statutCounts).sort((a,b)=>b[1]-a[1]).map(([statut, count]) => (
            <div key={statut} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#5a5a5a', minWidth: '110px' }}>{statut}</div>
              <div style={{ flex: 1, height: '6px', background: '#ede5d4', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count/maxStatut)*100}%`, background: (STATUT_COLORS as any)[statut] || '#aaa', borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a', minWidth: '24px', textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Sources</h4>
          {Object.entries(sourceCounts).sort((a,b)=>b[1]-a[1]).map(([source, count]) => (
            <div key={source} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#5a5a5a', minWidth: '80px' }}>{source}</div>
              <div style={{ flex: 1, height: '6px', background: '#ede5d4', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count/maxSource)*100}%`, background: (SOURCE_COLORS as any)[source] || '#aaa', borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a', minWidth: '24px', textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
