import Link from 'next/link'
import { ArrowRight, Flame, Infinity as InfinityIcon, Radio, Sparkles } from 'lucide-react'

const PILLARS = [
  {
    icon: InfinityIcon,
    title: 'Zero Custo de API',
    desc: 'Buscas ilimitadas e sem custos com Google Cloud ou tokens pagos.',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  },
  {
    icon: Flame,
    title: 'Filtro Sem Site',
    desc: 'Identificação imediata de empresas sem site na sua região prontas para abordagem.',
    color: 'text-hot',
    bg: 'bg-hot/10 border-hot/20',
  },
  {
    icon: Radio,
    title: 'Dados em Tempo Real',
    desc: 'Extração direta da fonte sob demanda com telefones e WhatsApp atualizados.',
    color: 'text-success',
    bg: 'bg-success/10 border-success/20',
  },
]

export function LogosStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:px-6" aria-labelledby="beta-pillars-title">
      <div className="flex flex-col items-center justify-between gap-4 border-y border-border/60 py-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
          <p id="beta-pillars-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Programa Beta Fechado • Vagas Limitadas
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:text-primary/80"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          Garantir Acesso Beta Antecipado
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="hover-lift flex items-start gap-3.5 rounded-xl border border-border bg-card/40 p-4 transition-colors hover:border-border/80 hover:bg-card/70"
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${p.bg}`}>
              <p.icon className={`size-4 ${p.color}`} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
