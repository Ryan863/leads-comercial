import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

const plans = [
  {
    name: 'Acesso Beta',
    price: '0',
    desc: 'Liberado gratuitamente durante o programa fechado.',
    features: [
      'Varreduras sob demanda',
      'Zero custo de API do Google Places',
      'Filtro de empresas "Sem Site"',
      'Exportação para CSV e Excel',
      'Disparo direto no WhatsApp',
    ],
    featured: true,
    badge: 'Acesso Imediato',
    cta: 'Começar Agora no Beta',
  },
  {
    name: 'Plano Fundador',
    price: '67',
    desc: 'Trave o valor vitalício mais baixo para quando o SaaS for lançado.',
    features: [
      'Tudo do Acesso Beta',
      'Preço promocional vitalício congelado',
      'Prioridade na fila do motor de raspagem',
      'Canal privado de feedback e roadmap',
      'Novos diretórios públicos em primeira mão',
    ],
    featured: false,
    badge: 'Preço Congelado',
    cta: 'Garantir Vaga Fundador',
  },
  {
    name: 'Agência & Custom',
    price: '249',
    desc: 'Para operações comerciais que precisam de automação em escala.',
    features: [
      'Instância dedicada de scraping Playwright',
      'Multi-cidades simultâneas',
      'Integração direta com Webhooks/CRM',
      'Suporte técnico individual',
    ],
    featured: false,
    badge: 'Escala Comercial',
    cta: 'Falar com Especialista',
  },
]

export function Pricing() {
  return (
    <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 md:px-6">
      <ScrollReveal>
        <SectionHeading
          badge="Condições Beta"
          title="Simplicidade com valor honesto"
          description="Explore o radar completo hoje sem cartão de crédito durante a fase de validação."
        />
      </ScrollReveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {plans.map((p, i) => (
          <ScrollReveal key={p.name} delay={i * 120}>
            <div
              className={`hover-lift relative flex h-full flex-col rounded-2xl border p-6 transition-all ${
                p.featured
                  ? 'border-primary/60 bg-gradient-to-b from-primary/20 via-card/80 to-card/80 shadow-xl shadow-primary/10 glow-primary'
                  : 'border-border bg-card/60 hover:border-border/80'
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                  <Sparkles className="size-3" aria-hidden="true" />
                  {p.badge}
                </span>
              )}
              {!p.featured && (
                <span className="mb-2 w-fit rounded-full border border-border bg-background/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {p.badge}
                </span>
              )}

              <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>

              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-sm font-medium text-muted-foreground">R$</span>
                <span className="text-4xl font-bold tracking-tight text-foreground">{p.price}</span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-xs leading-relaxed">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-foreground/90">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/app"
                className={`btn-press mt-8 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-center text-xs font-semibold transition ${
                  p.featured
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border bg-background/60 text-foreground hover:bg-accent'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
