import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lagune Grande — CRM',
  description: 'CRM Commercial — Lagune Grande Sidi Rahal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
