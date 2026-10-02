import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { HeroPreview } from './hero-preview'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background decorativo */}
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/25 blur-[140px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center md:px-6 md:pt-28">
        {/* 1. Destaque da Identidade Visual Sondar & Badge */}
        <div className="animate-fade-in-up delay-100 flex flex-col items-center">
          <div className="group relative mb-6 flex items-center justify-center rounded-2xl border border-sky-500/30 bg-card/60 px-7 py-3.5 shadow-2xl shadow-sky-500/10 backdrop-blur-xl transition-all hover:border-sky-400/50 hover:shadow-sky-500/20">
            <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-500/20 via-primary/20 to-emerald-500/20 opacity-70 blur-sm" />
            <div className="relative flex items-center gap-3">
              <img
                src="/sondar-logo.png"
                alt="Sondar — Radar de Leads B2B"
                className="h-11 sm:h-14 w-auto object-contain drop-shadow-[0_0_22px_rgba(56,189,248,0.4)]"
              />
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-200 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-sky-400" aria-hidden="true" />
            Projeto Pessoal Aberto • 100% Gratuito sem Mensalidade
          </span>
        </div>

        {/* 2. Título principal com staggered fade-in */}
        <h1 className="animate-fade-in-up delay-200 mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-gradient md:text-6xl">
          O radar que encontra seus próximos clientes comerciais B2B
        </h1>

        {/* 3. Subtítulo descritivo com staggered fade-in */}
        <p className="animate-fade-in-up delay-300 mt-5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          O <strong className="font-semibold text-foreground">Sondar</strong> extrai empresas reais dos mapas, identifica na hora quem ainda não tem site e prepara abordagens comerciais no WhatsApp em um único clique.
        </p>

        {/* 4. Ações com microinterações */}
        <div className="animate-fade-in-up delay-400 mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/app"
            className="btn-press hover-lift inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 glow-primary"
          >
            Iniciar varredura gratuita
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a
            href="#como-funciona"
            className="btn-press hover-lift inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Ver como funciona
          </a>
        </div>

        {/* 5. Mockup / Preview com suave reveal */}
        <div className="animate-fade-in-up delay-500 relative mt-16 w-full">
          <div className="pointer-events-none absolute -inset-x-10 -top-10 h-40 rounded-full bg-primary/20 blur-3xl" />
          <HeroPreview />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </section>
  )
}
