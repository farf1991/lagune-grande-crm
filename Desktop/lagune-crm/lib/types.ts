export type Role = 'admin' | 'manager' | 'commercial'
export type Source = 'Facebook' | 'Instagram' | 'Google' | 'TikTok' | 'Site web' | 'Référence' | 'Autre'
export type Statut = 'Nouveau' | 'Contacté' | 'Relance 1' | 'Relance 2' | 'Relance 3' | 'RDV Planifié' | 'RDV Fait' | 'Chaud' | 'Vendu' | 'Perdu'

export interface Profile {
  id: string
  nom: string
  email: string
  role: Role
  color: string
  actif: boolean
  created_at: string
}

export interface Lead {
  id: number
  nom: string
  tel: string
  ville?: string
  source: Source
  besoin?: string
  horaire?: string
  projet: string
  statut: Statut
  motif_perdu?: string
  relance_date?: string
  assigne_id?: string
  notes?: string
  commentaire_interne?: string
  created_at: string
  updated_at: string
  // Jointures
  profile?: Profile
  lead_logs?: LeadLog[]
}

export interface LeadLog {
  id: number
  lead_id: number
  auteur_id: string
  action: string
  result?: string
  note?: string
  created_at: string
  profile?: Profile
}

export const STATUTS: Statut[] = ['Nouveau','Contacté','Relance 1','Relance 2','Relance 3','RDV Planifié','RDV Fait','Chaud','Vendu','Perdu']
export const SOURCES: Source[] = ['Facebook','Instagram','Google','TikTok','Site web','Référence','Autre']
export const MOTIFS_PERTE = ['Prix trop élevé','Concurrence','Pas de financement','Injoignable','Projet annulé','Autre']

export const STATUT_COLORS: Record<Statut, string> = {
  'Nouveau': '#9a9a9a',
  'Contacté': '#4285f4',
  'Relance 1': '#d4852a',
  'Relance 2': '#c8602a',
  'Relance 3': '#e05a3a',
  'RDV Planifié': '#8b5fe8',
  'RDV Fait': '#2a7a8a',
  'Chaud': '#e8a000',
  'Vendu': '#2d8a5e',
  'Perdu': '#e05a3a',
}

export const SOURCE_COLORS: Record<Source, string> = {
  'Facebook': '#4267b2',
  'Instagram': '#c13584',
  'Google': '#4285f4',
  'TikTok': '#333',
  'Site web': '#2a7a8a',
  'Référence': '#c9a84c',
  'Autre': '#9a9a9a',
}
