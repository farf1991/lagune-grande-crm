'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { STATUT_COLORS } from '@/lib/types'

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function EquipePage() {
  const supabase = createClientComponentClient()
  const [leads, setLeads] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const todayStr = isoDay(now)
  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo, setDateTo] = useState(todayStr)
  const [activePeriod, setActivePeriod] = useState('today')

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (!prof || !['admin', 'manager'].includes(prof.role)) { window.location.href = '/dashboard'; return }
      const [{ data: leadsData }, { data: profilesData }, { data: logsData }] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('lead_logs').select('*'),
      ])
      setLeads(leadsData || [])
      setProfiles(profilesData || [])
      setLogs(logsData || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div style={{ padding: 40, color: '#9a9a9a', fontFamily: 'Outfit,sans-serif' }}>Chargement...</div>

  function applyPeriod(p: string) {
    const t = new Date()
    const s = isoDay(t)
    setActivePeriod(p)
    if (p === 'today') {
      setDateFrom(s); setDateTo(s)
    } else if (p === '7d') {
      const d = new Date(t); d.setDate(t.getDate() - 6)
      setDateFrom(isoDay(d)); setDateTo(s)
    } else if (p === '30d') {
      const d = new Date(t); d.setDate(t.getDate() - 29)
      setDateFrom(isoDay(d)); setDateTo(s)
    } else if (p === 'month') {
      setDateFrom(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`); setDateTo(s)
    } else if (p === 'prevmonth') {
      const first = new Date(t.getFullYear(), t.getMonth()-1, 1)
      const last = new Date(t.getFullYear(), t.getMonth(), 0)
      setDateFrom(isoDay(first)); setDateTo(isoDay(last))
    }
  }

  const commerciaux = profiles.filter(p => p.role === 'commercial')

  const motifs: Record<string, number> = {}
  leads.filter(l => l.statut === 'Perdu').forEach(l => { motifs[l.motif_perdu] = (motifs[l.motif_perdu] || 0) + 1 })
  const maxMotif = Math.max(...Object.values(motifs), 1)

  const statuts: Record<string, number> = {}
  leads.forEach(l => { statuts[l.statut] = (statuts[l.statut] || 0) + 1 })
  const maxStatut = Math.max(...Object.values(statuts), 1)

  const periods = [
    { key: 'today', label: "Auj." },
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: 'month', label: 'Ce mois' },
    { key: 'prevmonth', label: 'Mois préc.' },
  ]

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Outfit,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '24px', fontWeight: 600, color: '#1a3a4a' }}>Vue Équipe</h2>
        <p style={{ fontSize: '12px', color: '#9a9a9a' }}>Performance globale — Lagune Grande Sidi Rahal</p>
      </div>

      {/* KPIs globaux (toutes périodes) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total leads', val: leads.length, emoji: '👥', color: '#1a3a4a' },
          { label: 'Chauds', val: leads.filter(l => l.statut === 'Chaud').length, emoji: '🔥', color: '#d4852a' },
          { label: 'RDV', val: leads.filter(l => ['RDV Planifié','RDV Fait'].includes(l.statut)).length, emoji: '📅', color: '#2a7a8a' },
          { label: 'Vendus', val: leads.filter(l => l.statut === 'Vendu').length, emoji: '🏠', color: '#2d8a5e' },
          { label: 'Perdus', val: leads.filter(l => l.statut === 'Perdu').length, emoji: '❌', color: '#e05a3a' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid rgba(26,58,74,0.1)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: k.color }} />
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{k.emoji}</div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '32px', fontWeight: 600, color: '#1a3a4a', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: '10px', color: '#9a9a9a', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtre période */}
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

      {/* Performance commerciaux */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>
          Performance commerciaux
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid rgba(26,58,74,0.1)' }}>
                {['Commercial', 'Leads reçus (période)', 'Leads traités (période)', 'Taux traitement', 'RDV (total)', 'Vendus (total)', 'Conversion'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Commercial' ? 'left' : 'center', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9a9a9a', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commerciaux.map(com => {
                // Leads reçus dans la période (created_at dans la plage)
                const leadsRecusPeriod = leads.filter(l =>
                  l.assigne_id === com.id &&
                  l.created_at?.slice(0, 10) >= dateFrom &&
                  l.created_at?.slice(0, 10) <= dateTo
                )
                // Leads traités dans la période (au moins un log de ce commercial dans la plage)
                const logsComPeriod = logs.filter(lg =>
                  lg.auteur_id === com.id &&
                  lg.created_at?.slice(0, 10) >= dateFrom &&
                  lg.created_at?.slice(0, 10) <= dateTo
                )
                const leadsTraitesPeriod = new Set(logsComPeriod.map(lg => lg.lead_id)).size

                // Stats all-time
                const comLeads = leads.filter(l => l.assigne_id === com.id)
                const vendu = comLeads.filter(l => l.statut === 'Vendu').length
                const rdv = comLeads.filter(l => ['RDV Planifié','RDV Fait'].includes(l.statut)).length
                const taux = leadsRecusPeriod.length ? Math.round(leadsTraitesPeriod / leadsRecusPeriod.length * 100) : 0
                const conv = comLeads.length ? Math.round(vendu / comLeads.length * 100) : 0

                return (
                  <tr key={com.id} style={{ borderBottom: '1px solid rgba(26,58,74,0.06)' }}>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: com.color || '#2a7a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {com.nom[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a3a4a' }}>{com.nom}</div>
                          <div style={{ fontSize: '11px', color: '#9a9a9a' }}>{comLeads.length} leads au total</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a4a' }}>{leadsRecusPeriod.length}</div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#2d8a5e' }}>{leadsTraitesPeriod}</div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '56px', height: '6px', background: '#ede5d4', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(taux, 100)}%`, background: taux >= 70 ? '#2d8a5e' : taux >= 40 ? '#d4852a' : '#e05a3a', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a' }}>{taux}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#2a7a8a' }}>{rdv}</div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#2d8a5e' }}>{vendu}</div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: conv > 5 ? 'rgba(45,138,94,0.1)' : 'rgba(26,58,74,0.06)', color: conv > 5 ? '#2d8a5e' : '#9a9a9a' }}>{conv}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Motifs de perte */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Motifs de perte</h4>
          {Object.keys(motifs).length === 0
            ? <p style={{ color: '#9a9a9a', fontSize: '13px' }}>Aucun lead perdu</p>
            : Object.entries(motifs).sort((a, b) => b[1] - a[1]).map(([m, count]) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '9px' }}>
                <div style={{ fontSize: '11px', color: '#5a5a5a', minWidth: '130px' }}>{m}</div>
                <div style={{ flex: 1, height: '6px', background: '#ede5d4', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / maxMotif) * 100}%`, background: '#e05a3a', borderRadius: '3px' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a', minWidth: '20px', textAlign: 'right' }}>{count}</div>
              </div>
            ))
          }
        </div>

        {/* Pipeline statuts */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Pipeline statuts</h4>
          {Object.entries(statuts).sort((a, b) => b[1] - a[1]).map(([s, count]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '9px' }}>
              <div style={{ fontSize: '11px', color: '#5a5a5a', minWidth: '110px' }}>{s}</div>
              <div style={{ flex: 1, height: '6px', background: '#ede5d4', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxStatut) * 100}%`, background: (STATUT_COLORS as any)[s] || '#aaa', borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a', minWidth: '20px', textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
