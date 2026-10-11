'use client'

import { Building2, Coffee, Loader2, Pizza, Search, Stethoscope, UtensilsCrossed, Zap } from 'lucide-react'

const SUGGESTIONS = [
  { label: 'Pizzarias em Videira - SC', icon: Pizza },
  { label: 'Dentists in Miami - FL', icon: Stethoscope },
  { label: 'Coffee in Sydney - Australia', icon: Coffee },
  { label: 'Restaurants in London - UK', icon: UtensilsCrossed },
  { label: 'Clínicas em SP', icon: Building2 },
]

const QUANTITIES = [10, 20, 50, 100]

type Props = {
  query: string
  quantity: number
  scanning: boolean
  onQueryChange: (q: string) => void
  onQuantityChange: (n: number) => void
  onScan: (q?: string) => void
}

export function SearchPanel({ query, quantity, scanning, onQueryChange, onQuantityChange, onScan }: Props) {
  return (
    <form
      className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur"
      onSubmit={(e) => {
        e.preventDefault()
        onScan()
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="query" className="mb-2 block text-sm font-medium text-muted-foreground">
            Termo de Pesquisa Global (Nicho + Cidade, Estado ou País)
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="query"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Ex: Dentists in Miami - FL, Coffee in Sydney ou Pizzarias em Videira - SC"
              className="h-11 w-full rounded-lg border border-input bg-background/60 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="md:w-44">
          <label htmlFor="quantity" className="mb-2 block text-sm font-medium text-muted-foreground">
            Quantidade de Leads
          </label>
          <select
            id="quantity"
            value={quantity}
            onChange={(e) => onQuantityChange(Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            {QUANTITIES.map((q) => (
              <option key={q} value={q} className="bg-popover">
                {q} Leads
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={scanning || !query.trim()}
          className="btn-press hover-lift inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 glow-primary"
        >
          {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Zap className="size-4" aria-hidden="true" />}
          {scanning ? 'Varrendo...' : 'Iniciar Varredura'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">Sugestões rápidas:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={scanning}
            onClick={() => {
              onQueryChange(s.label)
              onScan(s.label)
            }}
            className="btn-press hover-lift inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1 text-xs transition hover:border-primary/50 hover:bg-accent disabled:opacity-50"
          >
            <s.icon className="size-3.5 text-primary" aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </div>
    </form>
  )
}
