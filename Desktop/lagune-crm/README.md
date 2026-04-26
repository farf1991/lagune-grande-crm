# 🌊 Lagune Grande CRM — Guide de déploiement

## Stack
- **Next.js 14** (App Router)
- **Supabase** (Auth + PostgreSQL)
- **Vercel** (Hébergement)

---

## ÉTAPE 1 — Supabase : créer les tables

1. Va sur [supabase.com](https://supabase.com) → ton projet
2. **SQL Editor** → **New Query**
3. Copie-colle tout le contenu de `supabase/schema.sql`
4. Clique **Run**

---

## ÉTAPE 2 — Créer le premier admin

Dans Supabase → **Authentication** → **Users** → **Add User** :
- Email : `admin@laguneprande.ma`
- Password : (ton mot de passe)
- Coche "Auto Confirm User"

Puis dans **SQL Editor** :
```sql
UPDATE public.profiles
SET role = 'admin', nom = 'Admin Lagune', color = '#1a3a4a'
WHERE email = 'admin@laguneprande.ma';
```

---

## ÉTAPE 3 — Variables d'environnement

Crée un fichier `.env.local` à la racine :
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Récupère ces valeurs dans Supabase → **Settings** → **API**

---

## ÉTAPE 4 — Push sur GitHub

```bash
git init
git add .
git commit -m "Lagune Grande CRM - initial"
git remote add origin https://github.com/TON_USER/lagune-grande-crm.git
git push -u origin main
```

---

## ÉTAPE 5 — Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com)
2. **New Project** → importe ton repo GitHub
3. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy** ✅

---

## Après déploiement

Connecte-toi avec l'admin et crée les comptes commerciaux depuis **Utilisateurs**.

---

## Structure du projet

```
lagune-grande-crm/
├── app/
│   ├── login/          → Page de connexion
│   ├── dashboard/
│   │   ├── page.tsx    → Dashboard principal
│   │   ├── leads/      → Gestion leads (tableau + kanban)
│   │   ├── equipe/     → Stats équipe (manager/admin)
│   │   ├── import/     → Import Excel
│   │   └── users/      → Gestion utilisateurs (admin)
│   └── api/users/      → API création users
├── components/
│   └── Sidebar.tsx
├── lib/
│   ├── supabase.ts     → Client Supabase
│   └── types.ts        → Types TypeScript
└── supabase/
    └── schema.sql      → Schema base de données
```
