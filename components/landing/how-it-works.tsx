import { SectionHeading } from './section-heading'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

const steps = [
  { n: '1', title: 'Defina o alvo', text: 'Digite o nicho e a cidade desejada, como "Pizzarias em Videira - SC" ou "Clínicas em SP".' },
  { n: '2', title: 'Inicie a varredura', text: 'O robô automatiza a busca em tempo real e classifica a presença web de cada estabelecimento.' },
  { n: '3', title: 'Feche negócios', text: 'Chame diretamente no WhatsApp com mensagem pronta ou exporte a lista completa para o seu CRM.' },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-20 overflow-hidden py-24">
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-[700px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <ScrollReveal>
          <SectionHeading
            badge="Como funciona"
            title="Do mapa ao WhatsApp em 3 passos"
            description="Sem planilhas manuais, sem horas copiando telefones. Só oportunidades reais prontas para abordagem."
          />
        </ScrollReveal>

        <div className="relative mt-20">
          <svg
            className="pointer-events-none absolute inset-x-0 top-6 hidden h-24 w-full md:block"
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="curve" x1="0" x2="1">
                <stop offset="0" stopColor="oklch(0.6 0.2 262)" stopOpacity="0.1" />
                <stop offset="0.5" stopColor="oklch(0.6 0.2 262)" stopOpacity="1" />
                <stop offset="1" stopColor="oklch(0.6 0.2 262)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path d="M0 90 C 250 90, 300 10, 500 10 S 750 90, 1000 90" fill="none" stroke="url(#curve)" strokeWidth="2" />
          </svg>

          <ol className="relative grid gap-12 md:grid-cols-3">
            {steps.map((step, i) => (
              <ScrollReveal key={step.n} delay={i * 150} className={`flex flex-col items-center text-center ${i === 1 ? 'md:-mt-6' : 'md:mt-16'}`}>
                <div className="hover-lift flex flex-col items-center">
                  <span className="text-6xl font-semibold leading-none text-gradient opacity-80">{step.n}</span>
                  <span className="mt-4 size-3 rounded-full bg-primary glow-primary" aria-hidden="true" />
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
