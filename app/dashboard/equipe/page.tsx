import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { STATUT_COLORS, SOURCE_COLORS } from '@/lib/types'

export default async function EquipePage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single()
  if (!profile || !['admin','manager'].includes(profile.role)) redirect('/dashboard')

  const { data: leads = [] } = await supabase.from('leads').select('*')
  const { data: profiles = [] } = await supabase.from('profiles').select('*')
  const commerciaux = profiles!.filter((p:any) => p.role === 'commercial')

  const motifs: Record<string,number> = {}
  leads!.filter((l:any) => l.statut === 'Perdu').forEach((l:any) => { motifs[l.motif_perdu] = (motifs[l.motif_perdu]||0)+1 })
  const maxMotif = Math.max(...Object.values(motifs), 1)

  const statuts: Record<string,number> = {}
  leads!.forEach((l:any) => { statuts[l.statut] = (statuts[l.statut]||0)+1 })
  const maxStatut = Math.max(...Object.values(statuts), 1)

  const sources: Record<string,number> = {}
  leads!.forEach((l:any) => { sources[l.source] = (sources[l.source]||0)+1 })
  const maxSource = Math.max(...Object.values(sources), 1)

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Outfit,sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '24px', fontWeight: 600, color: '#1a3a4a' }}>Vue Équipe</h2>
        <p style={{ fontSize: '12px', color: '#9a9a9a' }}>Performance globale — Lagune Grande Sidi Rahal</p>
      </div>

      {/* KPIs globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total leads', val: leads!.length, emoji: '👥', color: '#1a3a4a' },
          { label: 'Chauds', val: leads!.filter((l:any)=>l.statut==='Chaud').length, emoji: '🔥', color: '#d4852a' },
          { label: 'RDV', val: leads!.filter((l:any)=>['RDV Planifié','RDV Fait'].includes(l.statut)).length, emoji: '📅', color: '#2a7a8a' },
          { label: 'Vendus', val: leads!.filter((l:any)=>l.statut==='Vendu').length, emoji: '🏠', color: '#2d8a5e' },
          { label: 'Perdus', val: leads!.filter((l:any)=>l.statut==='Perdu').length, emoji: '❌', color: '#e05a3a' },
        ].map((k,i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid rgba(26,58,74,0.1)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: k.color }} />
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{k.emoji}</div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '32px', fontWeight: 600, color: '#1a3a4a', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: '10px', color: '#9a9a9a', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Performance par commercial */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Performance commerciaux</h4>
          {commerciaux.map((com:any) => {
            const comLeads = leads!.filter((l:any) => l.assigne_id === com.id)
            const vendu = comLeads.filter((l:any) => l.statut === 'Vendu').length
            const rdv = comLeads.filter((l:any) => ['RDV Planifié','RDV Fait'].includes(l.statut)).length
            const conv = comLeads.length ? Math.round(vendu/comLeads.length*100) : 0
            return (
              <div key={com.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(26,58,74,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: com.color||'#2a7a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>{com.nom[0]}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a3a4a' }}>{com.nom}</div>
                    <div style={{ fontSize: '11px', color: '#9a9a9a' }}>{comLeads.length} leads</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {[['RDV',rdv,'#2a7a8a'],['Vendus',vendu,'#2d8a5e'],['Conv.',conv+'%','#d4852a']].map(([l,v,c]) => (
                    <div key={l as string} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: c as string }}>{v}</div>
                      <div style={{ fontSize: '10px', color: '#9a9a9a' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Motifs de perte */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600, marginBottom: '16px' }}>Motifs de perte</h4>
          {Object.keys(motifs).length === 0 ? <p style={{ color: '#9a9a9a', fontSize: '13px' }}>Aucun lead perdu</p> :
            Object.entries(motifs).sort((a,b)=>b[1]-a[1]).map(([m,count]) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '9px' }}>
                <div style={{ fontSize: '11px', color: '#5a5a5a', minWidth: '130px' }}>{m}</div>
                <div style={{ flex: 1, height: '6px', background: '#ede5d4', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count/maxMotif)*100}%`, background: '#e05a3a', borderRadius: '3px' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a4a', minWidth: '20px', textAlign: 'right' }}>{count}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* All leads table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(26,58,74,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,58,74,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a4a' }}>Tous les leads ({leads!.length})</h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f0e8', borderBottom: '1.5px solid rgba(26,58,74,0.1)' }}>
                {['Lead','Source','Budget','Commercial','Statut','Ancienneté'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads!.map((l:any) => {
                const com = profiles!.find((p:any) => p.id === l.assigne_id)
                const color = (STATUT_COLORS as any)[l.statut] || '#aaa'
                const srcColor = (SOURCE_COLORS as any)[l.source] || '#aaa'
                const h = Math.floor((Date.now()-new Date(l.created_at).getTime())/3600000)
                const ageColor = h<24?'#2d8a5e':h<48?'#d4852a':'#e05a3a'
                const ageText = h<24?`${h}h`:`${Math.floor(h/24)}j`
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid rgba(26,58,74,0.06)' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1a3a4a', fontSize: '13px' }}>{l.nom}</div>
                      <div style={{ fontSize: '11px', color: '#9a9a9a' }}>{l.tel}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}><span style={{ background: srcColor+'18', color: srcColor, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{l.source}</span></td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: '#1a3a4a' }}>{l.budget||'—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#9a9a9a' }}>{(com as any)?.nom||'—'}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ color, background: color+'20', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{l.statut}</span></td>
                    <td style={{ padding: '11px 14px' }}><span style={{ background: ageColor+'18', color: ageColor, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{ageText}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
