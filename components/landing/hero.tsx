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
        {/* 1. Badge com staggered fade-in */}
        <div className="animate-fade-in-up delay-100">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Beta Aberto • Varredura Real Sem Custo de API
          </span>
        </div>

        {/* 2. Título principal com staggered fade-in */}
        <h1 className="animate-fade-in-up delay-200 mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-gradient md:text-6xl">
          O radar que encontra seus próximos clientes comerciais
        </h1>

        {/* 3. Subtítulo descritivo com staggered fade-in */}
        <p className="animate-fade-in-up delay-300 mt-5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          Extraia empresas reais dos mapas, identifique na hora quem ainda não tem site e inicie conversas
          comerciais no WhatsApp com mensagem personalizada em um único clique.
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
