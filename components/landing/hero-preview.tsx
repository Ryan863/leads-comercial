import { AtSign as Instagram, Building2, Flame, LayoutDashboard, MessageCircle, Radar, Search, Settings, Star, Users, Zap } from 'lucide-react'

const stats = [
  { label: 'Total de Leads', value: '48', icon: Building2, tone: 'text-foreground' },
  { label: 'Sem Site', value: '19', icon: Flame, tone: 'text-hot' },
  { label: 'Rede Social', value: '17', icon: Instagram, tone: 'text-social' },
  { label: 'WhatsApp', value: '44', icon: Zap, tone: 'text-success' },
]

const rows = [
  { name: 'Bella Napoli Pizzaria', tag: 'Sem site', tone: 'bg-hot/15 text-hot', rating: '4.8' },
  { name: 'Ponto Central Burger', tag: 'Rede social', tone: 'bg-social/15 text-social', rating: '4.6' },
  { name: 'Forno di Casa', tag: 'Sem site', tone: 'bg-hot/15 text-hot', rating: '4.7' },
  { name: 'La Piazza Delivery', tag: 'Tem site', tone: 'bg-primary/15 text-primary', rating: '4.4' },
]

const bars = [40, 65, 50, 80, 60, 92, 74]

export function HeroPreview() {
  return (
    <div
      className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-card/80 text-left shadow-2xl shadow-primary/20 backdrop-blur"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-hot/70" />
        <span className="size-2.5 rounded-full bg-yellow-400/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">app.sondar.com.br/radar</span>
      </div>

      <div className="flex">
        <aside className="hidden w-44 shrink-0 flex-col gap-1 border-r border-border p-3 text-xs md:flex">
          {[
            { icon: LayoutDashboard, label: 'Painel', active: false },
            { icon: Radar, label: 'Radar', active: true },
            { icon: Users, label: 'Meus Leads', active: false },
            { icon: MessageCircle, label: 'Conversas', active: false },
            { icon: Settings, label: 'Ajustes', active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${item.active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'}`}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </div>
          ))}
        </aside>

        <div className="flex-1 space-y-3 p-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              <Search className="size-3.5" />
              Pizzarias em Videira - SC
            </div>
            <div className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Iniciar Varredura</div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  {s.label}
                  <s.icon className={`size-3.5 ${s.tone}`} />
                </div>
                <p className={`mt-1 text-xl font-semibold ${s.tone}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/40 p-3 md:col-span-2">
              <p className="mb-2 text-xs font-medium">Leads encontrados</p>
              <ul className="space-y-1.5">
                {rows.map((r) => (
                  <li key={r.name} className="flex items-center justify-between rounded-md bg-card/80 px-2 py-1.5 text-[11px]">
                    <span className="truncate">{r.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="hidden items-center gap-1 text-muted-foreground sm:flex">
                        <Star className="size-3 fill-yellow-400 text-yellow-400" />
                        {r.rating}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 ${r.tone}`}>{r.tag}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs font-medium">Taxa de resposta</p>
              <p className="mt-1 text-2xl font-semibold">38%</p>
              <div className="mt-3 flex h-20 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
