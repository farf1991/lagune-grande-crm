'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ImportPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle'|'preview'|'importing'|'done'>('idle')
  const [rows, setRows] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string,number>>({})
  const [profiles, setProfiles] = useState<any[]>([])
  const [assigneId, setAssigneId] = useState('')
  const [result, setResult] = useState({ imported: 0, skipped: 0 })
  const [dragOver, setDragOver] = useState(false)

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role','commercial').eq('actif',true)
    setProfiles(data||[])
    if (data && data.length > 0) setAssigneId(data[0].id)
  }

  const handleFile = async (file: File) => {
    await loadProfiles()
    const XLSX = (await import('xlsx')).default
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 2) return
    const hdrs = data[0].map((h:any) => String(h).trim())
    setHeaders(hdrs)
    const dataRows = data.slice(1).filter((r:any[]) => r.some(c=>c))
    setRows(dataRows)
    // Auto mapping
    const fieldMap: Record<string,string[]> = {
      nom: ['nom','name','prénom','prenom','client'],
      tel: ['tel','téléphone','telephone','phone','mobile','gsm'],
      email: ['email','mail','e-mail'],
      source: ['source','canal','provenance'],
      budget: ['budget','prix','price']
    }
    const mp: Record<string,number> = {}
    Object.entries(fieldMap).forEach(([field, syns]) => {
      const idx = hdrs.findIndex(h => syns.some(s => h.toLowerCase().includes(s)))
      if (idx >= 0) mp[field] = idx
    })
    setMapping(mp)
    setStatus('preview')
  }

  const doImport = async () => {
    setStatus('importing')
    const { data: { session } } = await supabase.auth.getSession()
    // Get existing tels to detect doublons
    const { data: existingLeads } = await supabase.from('leads').select('tel')
    const existingTels = new Set((existingLeads||[]).map((l:any) => l.tel))
    let imported = 0, skipped = 0

    const batch: any[] = []
    rows.forEach(row => {
      const tel = mapping.tel !== undefined ? String(row[mapping.tel]||'').trim() : ''
      if (!tel || existingTels.has(tel)) { skipped++; return }
      batch.push({
        nom: mapping.nom !== undefined ? String(row[mapping.nom]||'').trim() : 'Inconnu',
        tel,
        email: mapping.email !== undefined ? String(row[mapping.email]||'').trim() : '',
        source: mapping.source !== undefined ? String(row[mapping.source]||'Autre').trim() : 'Autre',
        budget: mapping.budget !== undefined ? String(row[mapping.budget]||'').trim() : '',
        assigne_id: assigneId,
        statut: 'Nouveau',
        projet: 'Lagune Grande Sidi Rahal',
      })
    })

    // Batch insert par 100
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i+100)
      const { data: inserted } = await supabase.from('leads').insert(chunk).select('id')
      if (inserted) {
        imported += inserted.length
        // Logs
        const logs = inserted.map((l:any) => ({ lead_id: l.id, auteur_id: session?.user.id, action: 'Lead importé via Excel', note: '' }))
        await supabase.from('lead_logs').insert(logs)
      }
    }
    skipped += (rows.length - imported - skipped)

    setResult({ imported, skipped })
    setStatus('done')
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Outfit,sans-serif', maxWidth: '720px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '24px', fontWeight: 600, color: '#1a3a4a' }}>Import Excel</h2>
        <p style={{ fontSize: '12px', color: '#9a9a9a' }}>Importez vos leads depuis un fichier Excel ou CSV</p>
      </div>

      {status === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f) }}
          onClick={() => document.getElementById('file-input')?.click()}
          style={{ border: `2px dashed ${dragOver?'#2a7a8a':'rgba(26,58,74,0.2)'}`, borderRadius: '14px', padding: '50px', textAlign: 'center', cursor: 'pointer', background: dragOver?'rgba(42,122,138,0.04)':'#f5f0e8', transition: 'all 0.2s' }}
        >
          <input type="file" id="file-input" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if(f) handleFile(f) }} />
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>📊</div>
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#1a3a4a', marginBottom: '6px' }}>Glissez votre fichier Excel ici</h3>
          <p style={{ fontSize: '13px', color: '#9a9a9a' }}>ou cliquez pour sélectionner (.xlsx, .xls, .csv)</p>
          <p style={{ fontSize: '12px', color: '#2a7a8a', marginTop: '10px', fontWeight: 500 }}>Colonnes détectées automatiquement : Nom, Téléphone, Email, Source, Budget</p>
        </div>
      )}

      {status === 'preview' && (
        <div style={{ background: 'white', borderRadius: '14px', padding: '22px', border: '1px solid rgba(26,58,74,0.1)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a3a4a', marginBottom: '4px' }}>📊 {rows.length} leads trouvés</h3>
          <p style={{ fontSize: '13px', color: '#9a9a9a', marginBottom: '16px' }}>Vérifiez le mapping avant d&apos;importer</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {Object.entries(mapping).map(([field, idx]) => (
              <span key={field} style={{ background: 'rgba(42,122,138,0.1)', color: '#2a7a8a', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {field} ← {headers[idx]}
              </span>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9a9a9a', display: 'block', marginBottom: '6px' }}>Assigner à</label>
            <select value={assigneId} onChange={e => setAssigneId(e.target.value)} style={{ background: 'white', border: '1.5px solid rgba(26,58,74,0.12)', borderRadius: '9px', padding: '9px 12px', fontFamily: 'Outfit,sans-serif', fontSize: '13px', color: '#1a3a4a', fontWeight: 600 }}>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f0e8' }}>
                  {headers.map(h => <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#9a9a9a', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0,6).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(26,58,74,0.07)' }}>
                    {headers.map((_,j) => <td key={j} style={{ padding: '7px 10px', color: '#1a1a1a' }}>{row[j]||''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 6 && <p style={{ fontSize: '11px', color: '#9a9a9a', marginTop: '6px' }}>...et {rows.length-6} autres</p>}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={doImport} style={{ background: '#1a3a4a', color: 'white', border: 'none', borderRadius: '9px', padding: '11px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
              ✅ Importer {rows.length} leads
            </button>
            <button onClick={() => setStatus('idle')} style={{ background: 'white', color: '#5a5a5a', border: '1.5px solid rgba(26,58,74,0.12)', borderRadius: '9px', padding: '11px 18px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {status === 'importing' && (
        <div style={{ background: 'white', borderRadius: '14px', padding: '50px', textAlign: 'center', border: '1px solid rgba(26,58,74,0.1)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>⏳</div>
          <h3 style={{ color: '#1a3a4a', fontSize: '16px', fontWeight: 600 }}>Import en cours...</h3>
          <p style={{ color: '#9a9a9a', fontSize: '13px', marginTop: '6px' }}>Ne fermez pas cette page</p>
        </div>
      )}

      {status === 'done' && (
        <div style={{ background: 'white', borderRadius: '14px', padding: '50px', textAlign: 'center', border: '1px solid rgba(26,58,74,0.1)' }}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>✅</div>
          <h3 style={{ color: '#2d8a5e', fontSize: '20px', fontWeight: 700 }}>{result.imported} leads importés !</h3>
          {result.skipped > 0 && <p style={{ color: '#9a9a9a', fontSize: '13px', marginTop: '6px' }}>{result.skipped} doublons ignorés</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <button onClick={() => router.push('/dashboard/leads')} style={{ background: '#1a3a4a', color: 'white', border: 'none', borderRadius: '9px', padding: '11px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
              Voir les leads
            </button>
            <button onClick={() => setStatus('idle')} style={{ background: 'white', color: '#5a5a5a', border: '1.5px solid rgba(26,58,74,0.12)', borderRadius: '9px', padding: '11px 18px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
              Nouvel import
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
