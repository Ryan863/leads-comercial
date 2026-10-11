'use client'

import { Building2, Coffee, Globe, Loader2, Pizza, Search, Stethoscope, UtensilsCrossed, Zap } from 'lucide-react'

export type CountryOption = {
  code: string
  name: string
  flag: string
  suggestQuery?: string
}

export const COUNTRIES: CountryOption[] = [
  { code: 'auto', name: 'Qualquer País / Auto', flag: '🌍', suggestQuery: 'Dentists in Miami - FL' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', suggestQuery: 'Pizzarias em Videira - SC' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', suggestQuery: 'Dentists in Miami - FL' },
  { code: 'AU', name: 'Austrália', flag: '🇦🇺', suggestQuery: 'Coffee in Sydney - Australia' },
  { code: 'JP', name: 'Japão (日本)', flag: '🇯🇵', suggestQuery: 'Coffee in Tokyo Japan' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', suggestQuery: 'Restaurants in London - UK' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', suggestQuery: 'Restaurantes em Lisboa' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', suggestQuery: 'Restaurantes en Madrid' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', suggestQuery: 'Ristoranti a Roma' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', suggestQuery: 'Cafes in Berlin' },
  { code: 'FR', name: 'França', flag: '🇫🇷', suggestQuery: 'Restaurants in Paris' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', suggestQuery: 'Dentists in Toronto' },
]

const SUGGESTIONS = [
  { label: 'Pizzarias em Videira - SC', icon: Pizza, country: 'BR' },
  { label: 'Dentists in Miami - FL', icon: Stethoscope, country: 'US' },
  { label: 'Coffee in Tokyo - Japan', icon: Coffee, country: 'JP' },
  { label: 'Coffee in Sydney - Australia', icon: Coffee, country: 'AU' },
  { label: 'Restaurants in London - UK', icon: UtensilsCrossed, country: 'GB' },
  { label: 'Clínicas em São Paulo - SP', icon: Building2, country: 'BR' },
]

const QUANTITIES = [10, 20, 50, 100]

type Props = {
  query: string
  quantity: number
  country?: string
  scanning: boolean
  onQueryChange: (q: string) => void
  onQuantityChange: (n: number) => void
  onCountryChange?: (c: string) => void
  onScan: (q?: string) => void
}

export function SearchPanel({
  query,
  quantity,
  country = 'auto',
  scanning,
  onQueryChange,
  onQuantityChange,
  onCountryChange,
  onScan,
}: Props) {
  const selectedCountry = COUNTRIES.find((c) => c.code === country) || COUNTRIES[0]

  return (
    <form
      className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur shadow-lg shadow-black/5"
      onSubmit={(e) => {
        e.preventDefault()
        onScan()
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        {/* Termo de Pesquisa */}
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
              placeholder="Ex: Coffee in Tokyo, Dentists in Miami - FL ou Pizzarias em Videira - SC"
              className="h-11 w-full rounded-lg border border-input bg-background/60 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Seletor de País Alvo (Ao lado da Quantidade de Leads) */}
        <div className="w-full sm:w-auto lg:w-56">
          <label htmlFor="country" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Globe className="size-3.5 text-primary" aria-hidden="true" />
            <span>País Selecionado</span>
          </label>
          <div className="relative">
            <select
              id="country"
              value={country}
              onChange={(e) => {
                const newCountry = e.target.value
                onCountryChange?.(newCountry)
                const cObj = COUNTRIES.find((c) => c.code === newCountry)
                if (cObj?.suggestQuery && !query.trim()) {
                  onQueryChange(cObj.suggestQuery)
                }
              }}
              className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background/60 pl-3 pr-8 text-sm font-medium outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-popover text-foreground">
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ▼
            </span>
          </div>
        </div>

        {/* Quantidade de Leads */}
        <div className="w-full sm:w-auto lg:w-36">
          <label htmlFor="quantity" className="mb-2 block text-sm font-medium text-muted-foreground">
            Quantidade de Leads
          </label>
          <div className="relative">
            <select
              id="quantity"
              value={quantity}
              onChange={(e) => onQuantityChange(Number(e.target.value))}
              className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background/60 pl-3 pr-8 text-sm outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {QUANTITIES.map((q) => (
                <option key={q} value={q} className="bg-popover text-foreground">
                  {q} Leads
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ▼
            </span>
          </div>
        </div>

        {/* Botão de Disparo */}
        <button
          type="submit"
          disabled={scanning || !query.trim()}
          className="btn-press hover-lift inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 glow-primary"
        >
          {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Zap className="size-4" aria-hidden="true" />}
          {scanning ? 'Varrendo...' : 'Iniciar Varredura'}
        </button>
      </div>

      {/* Sugestões Rápidas Globais */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">Sugestões rápidas:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={scanning}
            onClick={() => {
              onQueryChange(s.label)
              if (s.country && onCountryChange) {
                onCountryChange(s.country)
              }
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
