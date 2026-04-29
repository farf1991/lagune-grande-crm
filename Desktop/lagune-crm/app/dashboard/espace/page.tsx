'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Lead, Profile, STATUTS, MOTIFS_PERTE, STATUT_COLORS } from '@/lib/types'

function fmtDate(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function hoursAgo(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 3600000) }
function relanceLabel(d: string) {
  const diff = Math.floor((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < -1) return { text: `En retard de ${-diff}j`, color: '#e05a3a', bg: 'rgba(224,90,58,0.08)', icon: '🔴' }
  if (diff < 0) return { text: 'En retard', color: '#e05a3a', bg: 'rgba(224,90,58,0.08)', icon: '🔴' }
  if (diff === 0) return { text: "Aujourd'hui", color: '#d4852a', bg: 'rgba(212,133,42,0.08)', icon: '🟡' }
  if (diff === 1) return { text: 'Demain', color: '#2a7a8a', bg: 'rgba(42,122,138,0.08)', icon: '🔵' }
  return { text: `Dans ${diff}j`, color: '#2a7a8a', bg: 'rgba(42,122,138,0.08)', icon: '🔵' }
}

export default function EspacePage() {
  const supabase = createClientComponentClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showPerdu, setShowPerdu] = useState(false)
  const [pendingStatut, setPendingStatut] = useState<{ leadId: number; statut: string } | null>(null)
  const [motifSelected, setMotifSelected] = useState('')
  const [motifComment, setMotifComment] = useState('')
  const [logNote, setLogNote] = useState('')
  const [relanceInput, setRelanceInput] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setMe(prof)
    const { data: profs } = await supabase.from('profiles').select('*')
    setProfiles(profs || [])
    let q = supabase.from('leads').select('*, lead_logs(*), profile:assigne_id(*)')
    const isManager = prof?.role === 'admin' || prof?.role === 'manager'
    if (!isManager) q = q.eq('assigne_id', session.user.id)
    const { data } = await q
    setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <div style={{ padding: 40, color: '#9a9a9a', fontFamily: 'Outfit,sans-serif' }}>Chargement...</div>

  const isManager = me?.role === 'admin' || me?.role === 'manager'

  // Priorité 1 : nouveaux leads jamais traités, du plus ancien au plus récent
  const nouveaux = leads
    .filter(l => l.statut === 'Nouveau')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Priorité 2 : relances programmées, du plus ancien au plus récent
  const relances = leads
    .filter(l => l.relance_date && l.statut !== 'Nouveau' && l.statut !== 'Vendu' && l.statut !== 'Perdu')
    .sort((a, b) => new Date(a.relance_date!).getTime() - new Date(b.relance_date!).getTime())

  // Actions
  const changeStatut = async (leadId: number, statut: string) => {
    if (statut === 'Perdu') { setPendingStatut({ leadId, statut }); setShowPerdu(true); return }
    await supabase.from('leads').update({ statut }).eq('id', leadId)
    await supabase.from('lead_logs').insert({ lead_id: leadId, auteur_id: me?.id, action: `Statut → ${statut}`, note: '' })
    showToast(`✅ Statut : ${statut}`)
    loadData()
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, statut: statut as any } : null)
  }

  const confirmPerdu = async () => {
    if (!motifSelected || !pendingStatut) return
    await supabase.from('leads').update({ statut: 'Perdu', motif_perdu: motifSelected }).eq('id', pendingStatut.leadId)
    await supabase.from('lead_logs').insert({ lead_id: pendingStatut.leadId, auteur_id: me?.id, action: `Lead perdu — ${motifSelected}${motifComment ? ' : ' + motifComment : ''}`, note: '' })
    setShowPerdu(false); setMotifSelected(''); setMotifComment(''); setPendingStatut(null)
    showToast('❌ Lead perdu enregistré'); loadData()
  }

  const saveRelance = async (leadId: number, val: string) => {
    await supabase.from('leads').update({ relance_date: val || null }).eq('id', leadId)
    if (val) await supabase.from('lead_logs').insert({ lead_id: leadId, auteur_id: me?.id, action: `Relance programmée : ${fmtDate(val)}`, note: '' })
    showToast('🔔 Relance enregistrée'); loadData()
  }

  const logAppel = async (leadId: number, result: string) => {
    await supabase.from('lead_logs').insert({ lead_id: leadId, auteur_id: me?.id, action: 'Appel effectué', result, note: logNote })
    const lead = leads.find(l => l.id === leadId)
    if (lead) {
      if (result === 'Répondu' && lead.statut === 'Nouveau') await supabase.from('leads').update({ statut: 'Contacté' }).eq('id', leadId)
      if (result === 'Pas répondu' && lead.statut === 'Contacté') await supabase.from('leads').update({ statut: 'Relance 1' }).eq('id', leadId)
    }
    setLogNote(''); showToast(`📞 Appel loggué : ${result}`); loadData()
    const { data } = await supabase.from('leads').select('*, lead_logs(*), profile:assigne_id(*)').eq('id', leadId).single()
    if (data) setSelectedLead(data)
  }

  const LeadCard = ({ lead, type }: { lead: Lead; type: 'nouveau' | 'relance' }) => {
    const h = hoursAgo(lead.created_at)
    const ageText = h < 24 ? `${h}h` : `${Math.floor(h / 24)}j`
    const ageColor = h < 24 ? '#2d8a5e' : h < 48 ? '#d4852a' : '#e05a3a'
    const rl = lead.relance_date ? relanceLabel(lead.relance_date) : null
    const isOverdue = rl && (rl.icon === '🔴' || rl.icon === '🟡')
    const borderColor = type === 'relance' && rl?.icon === '🔴' ? '#e05a3a'
      : type === 'relance' && rl?.icon === '🟡' ? '#d4852a'
      : type === 'nouveau' && h >= 48 ? '#e05a3a'
      : 'rgba(26,58,74,0.1)'

    return (
      <div style={{ background: 'white', borderRadius: '12px', border: `1.5px solid ${borderColor}`, padding: '16px 18px', boxShadow: '0 2px 8px rgba(26,58,74,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '18px', fontWeight: 600, color: '#1a3a4a' }}>{lead.nom}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#2a7a8a', letterSpacing: '0.3px' }}>{lead.tel}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
              {lead.ville && <span style={{ fontSize: '12px', color: '#5a5a5a' }}>📍 {lead.ville}</span>}
              {lead.besoin && <span style={{ fontSize: '12px', color: '#5a5a5a' }}>🏠 {lead.besoin}</span>}
              {lead.horaire && <span style={{ fontSize: '12px', color: '#5a5a5a' }}>⏰ {lead.horaire}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
            {type === 'nouveau' && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: ageColor, background: ageColor + '18', padding: '3px 8px', borderRadius: '8px' }}>Reçu il y a {ageText}</span>
            )}
            {type === 'relance' && rl && (
              <>
                <span style={{ fontSize: '11px', fontWeight: 700, color: rl.color, background: rl.bg, padding: '3px 8px', borderRadius: '8px' }}>{rl.icon} {rl.text}</span>
                <span style={{ fontSize: '10px', color: '#9a9a9a' }}>{fmtDate(lead.relance_date!)}</span>
              </>
            )}
            {type === 'relance' && (
              <span style={{ ...statusBadge(lead.statut) }}>{lead.statut}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
          <a href={`tel:${lead.tel}`} style={{ ...actionBtn, background: 'rgba(42,122,138,0.08)', color: '#2a7a8a', border: '1px solid rgba(42,122,138,0.2)', textDecoration: 'none' }}>📞 Appeler</a>
          <a href={`https://wa.me/${lead.tel.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ ...actionBtn, background: 'rgba(37,211,102,0.08)', color: '#1a8a3a', border: '1px solid rgba(37,211,102,0.25)', textDecoration: 'none' }}>💬 WhatsApp</a>
          <button onClick={() => setSelectedLead(lead)} style={{ ...actionBtn, background: '#1a3a4a', color: 'white', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>Traiter →</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Outfit,sans-serif', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '26px', fontWeight: 600, color: '#1a3a4a' }}>
          Mon espace
        </h2>
        <p style={{ fontSize: '13px', color: '#9a9a9a', marginTop: '2px' }}>
          {nouveaux.length} nouveau{nouveaux.length !== 1 ? 'x' : ''} lead{nouveaux.length !== 1 ? 's' : ''} · {relances.length} relance{relances.length !== 1 ? 's' : ''}
        </p>
      </div>

      {nouveaux.length === 0 && relances.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9a9a9a', fontSize: '15px' }}>
          ✅ Rien à traiter pour le moment
        </div>
      )}

      {/* Section 1 — Nouveaux leads */}
      {nouveaux.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a7a8a', display: 'inline-block' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a4a', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Nouveaux leads à appeler
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 700, background: '#2a7a8a', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>{nouveaux.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nouveaux.map(l => <LeadCard key={l.id} lead={l} type="nouveau" />)}
          </div>
        </div>
      )}

      {/* Section 2 — Relances */}
      {relances.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d4852a', display: 'inline-block' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a4a', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Relances
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 700, background: '#d4852a', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>{relances.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {relances.map(l => <LeadCard key={l.id} lead={l} type="relance" />)}
          </div>
        </div>
      )}

      {/* FICHE LEAD */}
      {selectedLead && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setSelectedLead(null) }}>
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '22px', fontWeight: 600, color: '#1a3a4a' }}>{selectedLead.nom}</div>
                <div style={{ marginTop: '6px' }}><span style={statusBadge(selectedLead.statut)}>{selectedLead.statut}</span></div>
              </div>
              <button onClick={() => setSelectedLead(null)} style={closeBtn}>✕</button>
            </div>
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>

              {/* Appels rapides */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <a href={`tel:${selectedLead.tel}`} style={{ ...actionBtn, background: '#2a7a8a', color: 'white', border: 'none', textDecoration: 'none', padding: '9px 16px', fontSize: '13px' }}>📞 Appeler</a>
                <a href={`https://wa.me/${selectedLead.tel.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ ...actionBtn, background: '#25D366', color: 'white', border: 'none', textDecoration: 'none', padding: '9px 16px', fontSize: '13px' }}>💬 WhatsApp</a>
              </div>

              {/* Infos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                  ['Téléphone', selectedLead.tel],
                  ['Ville', selectedLead.ville || '—'],
                  ['Besoin', selectedLead.besoin || '—'],
                  ['Horaire', selectedLead.horaire || '—'],
                  ['Source', selectedLead.source],
                  ['Créé le', new Date(selectedLead.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9a9a9a', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', marginTop: '3px', fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'rgba(26,58,74,0.1)', margin: '16px 0' }} />

              {/* Changer statut */}
              <div style={{ marginBottom: '14px' }}>
                <label style={fieldLabel}>Changer le statut</label>
                <select value={selectedLead.statut} onChange={e => changeStatut(selectedLead.id, e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid rgba(26,58,74,0.15)', borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '13px', color: '#1a3a4a', fontWeight: 600, background: 'white' }}>
                  {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Relance */}
              <div style={{ background: '#f5f0e8', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <label style={fieldLabel}>🔔 Programmer une relance</label>
                <input type="datetime-local" defaultValue={selectedLead.relance_date?.slice(0, 16) || ''} onChange={e => setRelanceInput(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(26,58,74,0.15)', borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '13px', background: 'white' }} />
                <button onClick={() => saveRelance(selectedLead.id, relanceInput)}
                  style={{ marginTop: '8px', padding: '7px 14px', background: '#1a3a4a', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Enregistrer
                </button>
              </div>

              {/* Log appel */}
              <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>📞 Logger un appel</label>
                <textarea value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="Note sur l'appel..."
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid rgba(26,58,74,0.12)', borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '13px', minHeight: '65px', resize: 'vertical', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[['Répondu', '#2d8a5e'], ['Pas répondu', '#e05a3a'], ['Rappel demandé', '#d4852a']].map(([r, c]) => (
                    <button key={r} onClick={() => logAppel(selectedLead.id, r)}
                      style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${c}40`, background: `${c}12`, color: c, fontFamily: 'Outfit,sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(26,58,74,0.1)', margin: '16px 0' }} />

              {/* Historique */}
              <label style={fieldLabel}>📋 Historique</label>
              {(selectedLead.lead_logs || []).length === 0 && <p style={{ color: '#9a9a9a', fontSize: '13px' }}>Aucune action enregistrée</p>}
              {(selectedLead.lead_logs || []).slice().reverse().map((log: any) => {
                const auteur = profiles.find(p => p.id === log.auteur_id)
                const c = log.result === 'Répondu' ? '#2d8a5e' : log.result === 'Pas répondu' ? '#e05a3a' : log.result === 'Rappel demandé' ? '#d4852a' : '#9a9a9a'
                return (
                  <div key={log.id} style={{ display: 'flex', gap: '10px', padding: '9px 0', borderBottom: '1px solid rgba(26,58,74,0.07)' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: c, marginTop: '5px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '13px', color: '#1a1a1a' }}><b>{log.action}</b>{log.note ? ' — ' + log.note : ''}</span>
                        <span style={{ fontSize: '11px', color: '#9a9a9a', marginLeft: '10px', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</span>
                      </div>
                      {log.result && <span style={{ display: 'inline-block', marginTop: '3px', fontSize: '11px', fontWeight: 600, color: c, background: c + '18', padding: '2px 8px', borderRadius: '8px' }}>{log.result}</span>}
                      {auteur && <span style={{ fontSize: '10px', color: '#9a9a9a', marginLeft: '6px' }}>{auteur.nom}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* MOTIF PERDU */}
      {showPerdu && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: '440px' }}>
            <div style={modalHeader}>
              <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '20px', fontWeight: 600, color: '#1a3a4a' }}>❌ Motif de perte</h3>
              <button onClick={() => { setShowPerdu(false); setPendingStatut(null) }} style={closeBtn}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {MOTIFS_PERTE.map(m => (
                  <button key={m} onClick={() => setMotifSelected(m)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${motifSelected === m ? '#e05a3a' : 'rgba(26,58,74,0.12)'}`, background: motifSelected === m ? 'rgba(224,90,58,0.06)' : 'white', fontFamily: 'Outfit,sans-serif', fontSize: '13px', cursor: 'pointer', color: motifSelected === m ? '#e05a3a' : '#5a5a5a', fontWeight: motifSelected === m ? 600 : 400, textAlign: 'left' }}>
                    {m}
                  </button>
                ))}
              </div>
              <textarea value={motifComment} onChange={e => setMotifComment(e.target.value)} placeholder="Commentaire (optionnel)..."
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(26,58,74,0.12)', borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '13px', minHeight: '60px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button onClick={() => { setShowPerdu(false); setPendingStatut(null) }}
                  style={{ padding: '9px 18px', background: 'white', border: '1.5px solid rgba(26,58,74,0.15)', borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '13px', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={confirmPerdu}
                  style={{ padding: '9px 18px', background: 'rgba(224,90,58,0.12)', color: '#e05a3a', border: '1px solid rgba(224,90,58,0.3)', borderRadius: '8px', fontFamily: 'Outfit,sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#1a3a4a', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', zIndex: 999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function statusBadge(statut: string): any {
  const color = (STATUT_COLORS as any)[statut] || '#aaa'
  return { display: 'inline-block', color, background: color + '20', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }
}

const actionBtn: any = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, fontFamily: 'Outfit,sans-serif' }
const overlay: any = { position: 'fixed', inset: 0, background: 'rgba(10,26,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)', padding: '20px' }
const modal: any = { background: 'white', borderRadius: '16px', width: '100%', maxWidth: '680px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
const modalHeader: any = { padding: '18px 22px 14px', borderBottom: '1px solid rgba(26,58,74,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
const closeBtn: any = { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9a9a9a', lineHeight: 1 }
const fieldLabel: any = { display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9a9a9a', marginBottom: '5px' }
