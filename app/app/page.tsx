import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/logo'
import { RadarApp } from '@/components/radar/radar-app'

export const metadata: Metadata = {
  title: 'Radar — Sondar',
  description: 'Varra o Google Maps e encontre leads comerciais B2B prontos para abordar.',
}

export default function RadarPage() {
  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-96 w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />

      <header className="relative border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Voltar ao site</span>
            </Link>
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary" aria-label="Usuário">
              VC
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <RadarApp />
      </main>
    </div>
  )
}
