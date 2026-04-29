'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { STATUT_COLORS } from '@/lib/types'

function fmtShort(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}
function getDaysInRange(from: string, to: string): { day: string; label: string }[] {
  const days: { day: string; label: string }[] = []
  const start = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dd = new Date(d)
    days.push({ day: isoDay(dd), label: totalDays > 14 ? String(dd.getDate()) : fmtShort(dd) })
  }
  return days
}

export default function DashboardPage() {
  const supabase = createClientComponentClient()
  const [profile, setProfile] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const today = isoDay(new Date())
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [activePeriod, setActivePeriod] = useState('today')

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
const isManager = prof?.role === 'admin' || prof?.role === 'manager'
      let q = supabase.from('leads').select('*')
      if (!isManager) q = q.eq('assigne_id', session.user.id)
      const { data: l } = await q
      setLeads(l || [])
      const { data: lg } = await supabase.from('lead_logs').select('*, profile:auteur_id(nom, color)')
      setLogs(lg || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div style={{ padding: 40, color: '#9a9a9a', fontFamily: 'Outfit,sans-serif' }}>Chargement...</div>

  function applyPeriod(p: string) {
    const now = new Date()
    const todayStr = isoDay(now)
    setActivePeriod(p)
    if (p === 'today') {
      setDateFrom(todayStr); setDateTo(todayStr)
    } else if (p === '7d') {
      const d = new Date(now); d.setDate(now.getDate() - 6)
      setDateFrom(isoDay(d)); setDateTo(todayStr)
    } else if (p === '30d') {
      const d = new Date(now); d.setDate(now.getDate() - 29)
      setDateFrom(isoDay(d)); setDateTo(todayStr)
    } else if (p === 'month') {
      setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`); setDateTo(todayStr)
    } else if (p === 'prevmonth') {
      const first = new Date(now.getFullYear(), now.getMonth()-1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      setDateFrom(isoDay(first)); setDateTo(isoDay(last))
    }
  }

  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  const total = leads.length
  const traites = leads.filter(l => l.statut !== 'Nouveau').length
  const rdv = leads.filter(l => ['RDV Planifié', 'RDV Fait'].includes(l.statut)).length
  const vendus = leads.filter(l => l.statut === 'Vendu').length
  const relancesAujourdhui = leads.filter(l => l.relance_date && new Date(l.relance_date) <= todayEnd)

  // Activité sur la période sélectionnée
  const logsPeriod = logs.filter(lg => {
    const d = lg.created_at?.slice(0, 10)
    return d >= dateFrom && d <= dateTo
  })
  const leadsTraitesPeriod = new Set(logsPeriod.map((lg: any) => lg.lead_id)).size

  const actParCom: Record<string, { nom: string; color: string; actions: number; leadIds: Set<number> }> = {}
  logsPeriod.forEach((lg: any) => {
    const id = lg.auteur_id
    if (!actParCom[id]) actParCom[id] = { nom: lg.profile?.nom || '?', color: lg.profile?.color || '#2a7a8a', actions: 0, leadIds: new Set() }
    actParCom[id].actions++
    actParCom[id].leadIds.add(lg.lead_id)
  })

  // Graphique jour par jour sur la période
  const chartDays = getDaysInRange(dateFrom, dateTo)
  const chartData = chartDays.map(d => {
    const logsDay = logs.filter(lg => lg.created_at?.slice(0, 10) === d.day)
    return { ...d, count: new Set(logsDay.map((lg: any) => lg.lead_id)).size }
  })
  const maxChart = Math.max(...chartData.map(d => d.count), 1)

  const statutCounts: Record<string, number> = {}
  leads.forEach(l => { statutCounts[l.statut] = (statutCounts[l.statut] || 0) + 1 })
  const maxStatut = Math.max(...Object.values(statutCounts), 1)

  const periods = [
    { key: 'today', label: "Auj." },
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: 'month', label: 'Ce mois' },
    { key: 'prevmonth', label: 'Mois préc.' },
  ]

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Outfit,sans-serif' }}>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '26px', fontWeight: 600, color: '#1a3a4a' }}>
          Bonjour {profile?.nom?.split(' ')[0]} 👋
        </h2>
        <p style={{ fontSize: '13px', color: '#9a9a9a', marginTop: '2px' }}>Lagune Grande Sidi Rahal — Dashboard</p>
      </div>

      {relancesAujourdhui.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#fff8e8,#fff3d4)', border: '1.5px solid #c9a84c', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '24px' }}>🔔</span>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a3a4a' }}>{relancesAujourdhui.length} relance{relancesAujourdhui.length > 1 ? 's' : ''} aujourd&apos;hui</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {relancesAujourdhui.map(l => {
                const late = new Date(l.relance_date) < now
                return (
                  <a key={l.id} href="/dashboard/leads" style={{ background: 'white', border: `1px solid ${late ? '#e05a3a' : '#c9a84c'}`, borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: late ? '#e05a3a' : '#1a3a4a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {late ? '⚠️' : '📞'} {l.nom}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPIs globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total leads', val: total, emoji: '👥', color: '#1a3a4a' },
          { label: 'Leads traités', val: traites, emoji: '✅', color: '#2d8a5e' },
          { label: 'RDV', val: rdv, emoji: '📅', color: '#2a7a8a' },
          { label: 'Vendus', val: vendus, emoji: '🏠', color: '#c9a84c' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)', boxShadow: '0 2px 12px rgba(26,58,74,0.06)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: kpi.color }} />
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>{kpi.emoji}</div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '36px', fontWeight: 600, color: '#1a3a4a', lineHeight: 1 }}>{kpi.val}</div>
            <div style={{ fontSize: '11px', color: '#9a9a9a', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filtre période — contrôle les deux panneaux */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '14px 20px', border: '1px solid rgba(26,58,74,0.1)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#9a9a9a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Période</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {periods.map(p => (
            <button key={p.key} onClick={() => applyPeriod(p.key)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1.5px solid', borderColor: activePeriod === p.key ? '#2a7a8a' : 'rgba(26,58,74,0.12)', background: activePeriod === p.key ? '#2a7a8a' : 'white', color: activePeriod === p.key ? 'white' : '#5a5a5a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePeriod('custom') }}
            style={{ border: '1.5px solid rgba(26,58,74,0.12)', borderRadius: '8px', padding: '5px 10px', fontFamily: 'Outfit,sans-serif', fontSize: '12px', color: '#1a3a4a', outline: 'none' }} />
          <span style={{ fontSize: '12px', color: '#9a9a9a' }}>→</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePeriod('custom') }}
            style={{ border: '1.5px solid rgba(26,58,74,0.12)', borderRadius: '8px', padding: '5px 10px', fontFamily: 'Outfit,sans-serif', fontSize: '12px', color: '#1a3a4a', outline: 'none' }} />
        </div>
      </div>

      {/* Panneaux activité */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Résumé période */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Activité — période sélectionnée</h4>
          <div style={{ background: 'rgba(45,138,94,0.06)', border: '1px solid rgba(45,138,94,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '36px', fontWeight: 700, color: '#2d8a5e', lineHeight: 1 }}>{leadsTraitesPeriod}</div>
              <div style={{ fontSize: '12px', color: '#2d8a5e', fontWeight: 600, marginTop: '2px' }}>leads traités</div>
            </div>
          </div>
          {Object.keys(actParCom).length === 0 ? (
            <p style={{ fontSize: '13px', color: '#9a9a9a', textAlign: 'center', padding: '10px' }}>Aucune activité sur cette période</p>
          ) : (
            Object.entries(actParCom).sort((a, b) => b[1].leadIds.size - a[1].leadIds.size).map(([id, com]) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(26,58,74,0.07)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: com.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {com.nom[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a3a4a' }}>{com.nom}</div>
                  <div style={{ fontSize: '11px', color: '#9a9a9a' }}>{com.actions} action{com.actions > 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#2d8a5e' }}>{com.leadIds.size}</div>
                  <div style={{ fontSize: '10px', color: '#9a9a9a' }}>leads</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Graphique jour par jour */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Leads traités — jour par jour</h4>
          <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
            {chartData.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9a9a9a', textAlign: 'center', padding: '20px' }}>Sélectionnez une période valide</p>
            ) : chartData.map(d => (
              <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
                <div style={{ fontSize: '11px', color: '#9a9a9a', minWidth: '52px', textAlign: 'right' }}>{d.label}</div>
                <div style={{ flex: 1, height: '8px', background: '#ede5d4', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(d.count / maxChart) * 100}%`, background: '#2a7a8a', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a', minWidth: '22px', textAlign: 'right' }}>{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Pipeline statuts</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
          {Object.entries(statutCounts).sort((a, b) => b[1] - a[1]).map(([statut, count]) => (
            <div key={statut} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#5a5a5a', minWidth: '110px' }}>{statut}</div>
              <div style={{ flex: 1, height: '6px', background: '#ede5d4', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxStatut) * 100}%`, background: (STATUT_COLORS as any)[statut] || '#aaa', borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a', minWidth: '24px', textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
