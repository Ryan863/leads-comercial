import { AtSign as Instagram, Building2, Flame, Zap } from 'lucide-react'
import type { Lead } from '@/lib/leads'

export function StatsCards({ leads }: { leads: Lead[] }) {
  const total = leads.length
  const noSite = leads.filter((l) => l.presence === 'none').length
  const social = leads.filter((l) => l.presence === 'social').length
  const whatsapp = leads.filter((l) => l.whatsapp).length
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1).replace('.', ',')}%` : '0%')

  const cards = [
    { label: 'Total de Leads', value: total, hint: 'Empresas mapeadas', icon: Building2, tone: 'text-foreground', iconBg: 'bg-primary/15 text-primary', ring: '' },
    { label: 'Sem Site (Alta Prioridade)', value: noSite, hint: `${pct(noSite)} das empresas`, icon: Flame, tone: 'text-hot', iconBg: 'bg-hot/15 text-hot', ring: 'hover:border-hot/40' },
    { label: 'Usa Rede Social', value: social, hint: `${pct(social)} das empresas`, icon: Instagram, tone: 'text-social', iconBg: 'bg-social/15 text-social', ring: 'hover:border-social/40' },
    { label: 'WhatsApp Disponível', value: whatsapp, hint: 'Prontos para 1 clique', icon: Zap, tone: 'text-success', iconBg: 'bg-success/15 text-success', ring: 'hover:border-success/40' },
  ]

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <li key={c.label} className={`hover-lift rounded-2xl border border-border bg-card/70 p-4 transition-all md:p-5 ${c.ring}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground md:text-sm">{c.label}</p>
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}>
              <c.icon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${c.tone}`}>{c.value}</span>
            <span className={`text-xs ${c.tone === 'text-foreground' ? 'text-muted-foreground' : c.tone}`}>{c.hint}</span>
          </p>
        </li>
      ))}
    </ul>
  )
}
