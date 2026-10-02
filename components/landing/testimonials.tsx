import Link from 'next/link'
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Terminal, Zap } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

const betaPerks = [
  {
    icon: Zap,
    title: 'Independência de APIs Pagas',
    desc: 'Esqueça faturas imprevisíveis do Google Places ou limites rígidos de créditos. O motor automatizado roda localmente sob demanda.',
    badge: 'Sem Custo de API',
  },
  {
    icon: Terminal,
    title: 'Identificação Imediata "Sem Site"',
    desc: 'Filtro cirúrgico para encontrar empresas com presença digital precária — o cliente ideal para vender sites, tráfego e sistemas.',
    badge: 'Alta Conversão',
  },
  {
    icon: ShieldCheck,
    title: 'Canal Direto com os Desenvolvedores',
    desc: 'Como membro do Beta Fechado, você tem contato direto para solicitar novos nichos, filtros e recursos no roadmap.',
    badge: 'Early Adopter',
  },
]

export function Testimonials() {
  return (
    <section id="depoimentos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 md:px-6">
      <ScrollReveal>
        <SectionHeading
          badge="Acesso Beta"
          title="Construído para quem vive de prospecção ativa"
          description="Transparência total: estamos em fase beta fechada focados em entregar o melhor radar de prospecção sem cobranças abusivas."
        />
      </ScrollReveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {betaPerks.map((perk, i) => (
          <ScrollReveal key={perk.title} delay={i * 120}>
            <div className="hover-lift flex h-full flex-col justify-between rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/40 hover:bg-card/90">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <perk.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    {perk.badge}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">{perk.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{perk.desc}</p>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-border/60 pt-4 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                Disponível na versão atual
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={250}>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card/70 to-card/70 p-6 sm:flex-row md:p-8">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-foreground">Quer começar a prospectar sem pagar por API?</p>
            <p className="text-xs text-muted-foreground">O acesso ao radar de varredura está liberado para testes imediatos no seu navegador.</p>
          </div>
          <Link
            href="/app"
            className="btn-press inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 glow-primary"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Entrar no Beta Gratuito
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </ScrollReveal>
    </section>
  )
}
