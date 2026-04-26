import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

  const { nom, email, pwd, role, color } = await req.json()
  if (!nom || !email || !pwd || !role) return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })

  // Créer l'user dans Supabase Auth
  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email, password: pwd,
    user_metadata: { nom, role },
    email_confirm: true
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Mettre à jour le profil (le trigger l'a créé, on met à jour la couleur)
  await supabaseAdmin.from('profiles').update({ color }).eq('id', newUser.user.id)

  return NextResponse.json({ success: true })
}
