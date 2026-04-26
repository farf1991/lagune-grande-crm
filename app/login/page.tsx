'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #0a1a26 0%, #1a3a4a 50%, #2a7a8a 100%)',
      fontFamily:'Outfit, sans-serif'
    }}>
      <div style={{
        background:'rgba(255,255,255,0.97)', borderRadius:'20px',
        padding:'48px 40px', width:'400px',
        boxShadow:'0 20px 80px rgba(0,0,0,0.3)'
      }}>
        <div style={{textAlign:'center', marginBottom:'32px'}}>
          <div style={{fontSize:'32px', marginBottom:'10px'}}>🌊</div>
          <h1 style={{fontFamily:'Cormorant Garamond, serif', fontSize:'26px', fontWeight:600, color:'#1a3a4a', lineHeight:1.1}}>
            Lagune Grande<br/>Sidi Rahal
          </h1>
          <p style={{fontSize:'11px', color:'#9a9a9a', marginTop:'6px', letterSpacing:'2px', textTransform:'uppercase'}}>CRM Commercial</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block', fontSize:'11px', fontWeight:600, color:'#5a5a5a', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.8px'}}>Email</label>
            <input
              type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              placeholder="votre@email.com"
              style={{width:'100%', padding:'12px 14px', border:'1.5px solid #e0d8cc', borderRadius:'10px', fontSize:'14px', outline:'none', fontFamily:'Outfit,sans-serif'}}
            />
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block', fontSize:'11px', fontWeight:600, color:'#5a5a5a', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.8px'}}>Mot de passe</label>
            <input
              type="password" value={password} onChange={e=>setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{width:'100%', padding:'12px 14px', border:'1.5px solid #e0d8cc', borderRadius:'10px', fontSize:'14px', outline:'none', fontFamily:'Outfit,sans-serif'}}
            />
          </div>
          {error && <div style={{background:'rgba(224,90,58,0.08)', border:'1px solid rgba(224,90,58,0.3)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#e05a3a', marginBottom:'14px'}}>{error}</div>}
          <button
            type="submit" disabled={loading}
            style={{width:'100%', padding:'14px', background:'linear-gradient(135deg, #1a3a4a 0%, #2a7a8a 100%)', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', letterSpacing:'0.5px', opacity: loading ? 0.7 : 1}}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
