import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'

export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-10 md:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/30 via-card to-card p-10 text-center md:p-16">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <h2 className="relative text-balance text-3xl font-semibold tracking-tight md:text-4xl">Seu próximo cliente já está no mapa</h2>
        <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">Faça sua primeira varredura grátis agora, sem cartão de crédito.</p>
        <Link
          href="/app"
          className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 glow-primary"
        >
          Abrir o Radar
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
        <Logo />
        <p>{`© ${new Date().getFullYear()} LeadRadar. Todos os direitos reservados.`}</p>
      </div>
    </footer>
  )
}
