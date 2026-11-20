import type { Metadata } from 'next'
import { Logo } from '@/components/logo'
import { RadarApp } from '@/components/radar/radar-app'

export const metadata: Metadata = {
  title: 'Sondar — Radar de Leads Comercial',
  description: 'Encontre clientes no Google Maps e envie abordagens personalizadas no WhatsApp.',
}

export default function HomePage() {
  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-96 w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />

      <header className="relative border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Logo />
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary" aria-label="Usuário">
            RV
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <RadarApp />
      </main>
    </div>
  )
}
