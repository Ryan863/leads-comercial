import { Download, Filter, Flame, Mail, MapPin, MessageCircle, Radar } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

export function Features() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 md:px-6">
      <ScrollReveal>
        <SectionHeading
          badge="Recursos"
          title="Pare de procurar. Comece a vender."
          description="Tudo que você precisa para transformar os mapas e diretórios públicos em uma máquina de prospecção sem custo de API."
        />
      </ScrollReveal>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        <ScrollReveal className="md:col-span-2">
          <article className="hover-lift relative h-full overflow-hidden rounded-2xl border border-border bg-card/60 p-6">
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
              <div className="flex-1">
                <Radar className="size-6 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold">Varredura em tempo real</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Digite nicho + cidade e o robô mapeia empresas com telefone, avaliações, horário e presença digital em tempo real.
                </p>
              </div>
              <div className="relative mx-auto flex size-44 shrink-0 items-center justify-center rounded-full border border-primary/30">
                <div className="absolute inset-4 rounded-full border border-primary/20" />
                <div className="absolute inset-10 rounded-full border border-primary/20" />
                <div className="absolute inset-0 animate-radar rounded-full bg-[conic-gradient(from_0deg,transparent_70%,oklch(0.6_0.2_262/0.6))]" />
                <span className="absolute left-8 top-10 size-2 animate-ping-slow rounded-full bg-hot" />
                <span className="absolute bottom-12 right-8 size-2 animate-ping-slow rounded-full bg-success [animation-delay:0.8s]" />
                <span className="absolute right-14 top-6 size-2 animate-ping-slow rounded-full bg-social [animation-delay:1.6s]" />
                <span className="size-3 rounded-full bg-primary glow-primary" />
              </div>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <article className="hover-lift h-full rounded-2xl border border-border bg-card/60 p-6">
            <Flame className="size-6 text-hot" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Prioridade automática</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Empresas sem site são marcadas com Alta Prioridade — o lead ideal para quem vende criação de sites, tráfego ou software.
            </p>
          </article>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <article className="hover-lift h-full rounded-2xl border border-border bg-card/60 p-6">
            <MessageCircle className="size-6 text-success" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">WhatsApp em 1 clique</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Inicie a conversa pelo WhatsApp com template comercial personalizado contendo o nome da empresa mapeada.
            </p>
          </article>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <article className="hover-lift h-full rounded-2xl border border-border bg-card/60 p-6">
            <Filter className="size-6 text-social" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Filtros inteligentes</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Isole por sem site, rede social ou domínio próprio. Busque por nome, telefone e mostre apenas quem tem WhatsApp.
            </p>
          </article>
        </ScrollReveal>

        <ScrollReveal delay={250}>
          <article className="hover-lift h-full rounded-2xl border border-border bg-card/60 p-6">
            <Download className="size-6 text-primary" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Exportação total</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Exporte para CSV e Excel formatado, ou copie a lista limpa de telefones diretamente para a sua área de transferência.
            </p>
            <div className="mt-4 flex gap-2 text-xs">
              {['CSV', 'Excel', 'Telefones'].map((f) => (
                <span key={f} className="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">
                  {f}
                </span>
              ))}
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal delay={300} className="md:col-span-3">
          <article className="hover-lift flex flex-col justify-between gap-6 rounded-2xl border border-border bg-gradient-to-br from-primary/20 to-card/60 p-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold">Cobertura nacional em qualquer cidade</h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Das capitais às cidades do interior: pesquise qualquer nicho e localidade sem limites artificiais de dados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Videira - SC', 'São Paulo - SP', 'Florianópolis - SC', 'Curitiba - PR', 'Belo Horizonte - MG'].map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs">
                  <MapPin className="size-3 text-primary" aria-hidden="true" />
                  {c}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-primary">
                <Mail className="size-3 text-primary" aria-hidden="true" />
                +5.500 municípios
              </span>
            </div>
          </article>
        </ScrollReveal>
      </div>
    </section>
  )
}
