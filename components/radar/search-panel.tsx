'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, Clock, Coffee, Globe, History, Loader2, Pizza, Search, Stethoscope, Trash2, UtensilsCrossed, X, Zap } from 'lucide-react'

const HISTORY_STORAGE_KEY = 'sondar_search_history_v1'

export type SearchHistoryItem = {
  id: string
  query: string
  normalized: string
  date: string
}

function normalizeForHistory(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:em|na|no|de|da|do|sc|sp|pr|rs|mg|rj|ba|ce|pe|df|go|es|mt|ms|am|pa)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function loadHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(items: SearchHistoryItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 100)))
  } catch {
    // ignore
  }
}

function formatHistoryDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export type CountryOption = {
  code: string
  name: string
  flag: string
  suggestQuery?: string
}

export const COUNTRIES: CountryOption[] = [
  { code: 'auto', name: 'Qualquer País / Auto', flag: '🌍', suggestQuery: 'Dentists in Miami - FL' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', suggestQuery: 'Pizzarias em Videira - SC' },
  { code: 'AE', name: 'Emirados Árabes (Dubai)', flag: '🇦🇪', suggestQuery: 'Clinics in Dubai UAE' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', suggestQuery: 'Dentists in Miami - FL' },
  { code: 'AU', name: 'Austrália', flag: '🇦🇺', suggestQuery: 'Coffee in Sydney - Australia' },
  { code: 'JP', name: 'Japão (日本)', flag: '🇯🇵', suggestQuery: 'Coffee in Tokyo Japan' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', suggestQuery: 'Restaurants in London - UK' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', suggestQuery: 'Restaurantes em Lisboa' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', suggestQuery: 'Restaurantes en Madrid' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', suggestQuery: 'Ristoranti a Roma' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', suggestQuery: 'Cafes in Berlin' },
  { code: 'FR', name: 'França', flag: '🇫🇷', suggestQuery: 'Restaurants in Paris' },
  { code: 'CH', name: 'Suíça', flag: '🇨🇭', suggestQuery: 'Clinics in Zurich' },
  { code: 'NL', name: 'Holanda / Países Baixos', flag: '🇳🇱', suggestQuery: 'Restaurants in Amsterdam' },
  { code: 'IE', name: 'Irlanda', flag: '🇮🇪', suggestQuery: 'Cafes in Dublin' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪', suggestQuery: 'Clinics in Brussels' },
  { code: 'SE', name: 'Suécia', flag: '🇸🇪', suggestQuery: 'Restaurants in Stockholm' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴', suggestQuery: 'Cafes in Oslo' },
  { code: 'PL', name: 'Polônia', flag: '🇵🇱', suggestQuery: 'Clinics in Warsaw' },
  { code: 'AT', name: 'Áustria', flag: '🇦🇹', suggestQuery: 'Cafes in Vienna' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', suggestQuery: 'Dentists in Toronto' },
]

const SUGGESTIONS = [
  { label: 'Pizzarias em Videira - SC', icon: Pizza, country: 'BR' },
  { label: 'Clinics in Dubai - UAE', icon: Stethoscope, country: 'AE' },
  { label: 'Dentists in Miami - FL', icon: Stethoscope, country: 'US' },
  { label: 'Coffee in Tokyo - Japan', icon: Coffee, country: 'JP' },
  { label: 'Coffee in Sydney - Australia', icon: Coffee, country: 'AU' },
  { label: 'Restaurants in London - UK', icon: UtensilsCrossed, country: 'GB' },
  { label: 'Clinics in Zurich - Switzerland', icon: Building2, country: 'CH' },
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
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  function recordSearch(term: string) {
    const clean = term.trim()
    if (!clean) return
    const norm = normalizeForHistory(clean)
    if (!norm) return

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.normalized !== norm)
      const next: SearchHistoryItem[] = [
        { id: `${Date.now()}`, query: clean, normalized: norm, date: new Date().toISOString() },
        ...filtered,
      ].slice(0, 100)
      saveHistory(next)
      return next
    })
  }

  function removeHistoryItem(id: string) {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id)
      saveHistory(next)
      return next
    })
  }

  function clearAllHistory() {
    setHistory([])
    saveHistory([])
  }

  // Detecta em tempo real se o nicho + cidade digitado já está no histórico
  const matchedHistory = useMemo(() => {
    const normInput = normalizeForHistory(query)
    if (normInput.length < 4) return null
    return (
      history.find((item) => {
        if (item.normalized === normInput) return true
        // Verifica correspondência de todas as palavras relevantes (ex: "odontologia chapeco" bate com "odontologia em chapeco - sc")
        const inputWords = normInput.split(' ').filter((w) => w.length >= 3)
        const itemWords = item.normalized.split(' ').filter((w) => w.length >= 3)
        if (inputWords.length >= 2 && itemWords.length >= 2) {
          return inputWords.every((w) => itemWords.some((iw) => iw.includes(w) || w.includes(iw)))
        }
        return false
      }) || null
    )
  }, [query, history])

  return (
    <form
      className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur shadow-lg shadow-black/5"
      onSubmit={(e) => {
        e.preventDefault()
        recordSearch(query)
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

      {/* Alerta instantâneo quando o nicho/cidade digitado já foi pesquisado antes */}
      {matchedHistory && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <b>Você já pesquisou esse nicho:</b> &ldquo;{matchedHistory.query}&rdquo;{' '}
              <span className="text-amber-200/80">(em {formatHistoryDate(matchedHistory.date)})</span>
            </span>
          </div>
          <span className="text-[11px] text-amber-200/75">
            Se quiser pesquisar de novo mesmo assim, basta clicar em Iniciar Varredura.
          </span>
        </div>
      )}

      {/* Histórico de Nichos Pesquisados */}
      {history.length > 0 && (
        <div className="mt-4 border-t border-border/70 pt-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <History className="size-3.5 text-primary" aria-hidden="true" />
              Histórico de Nichos Pesquisados ({history.length})
            </span>
            <button
              type="button"
              onClick={clearAllHistory}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-destructive"
            >
              <Trash2 className="size-3" aria-hidden="true" />
              Limpar histórico
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 pl-2.5 pr-1.5 py-1 text-xs transition hover:border-primary/50"
              >
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => {
                    onQueryChange(item.query)
                  }}
                  title={`Pesquisado em ${formatHistoryDate(item.date)} — clique para preencher`}
                  className="inline-flex items-center gap-1.5 text-foreground hover:text-primary disabled:opacity-50"
                >
                  <Clock className="size-3 text-muted-foreground" aria-hidden="true" />
                  <span>{item.query}</span>
                  <span className="text-[10px] text-muted-foreground">({formatHistoryDate(item.date).split(' ')[0]})</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeHistoryItem(item.id)}
                  aria-label={`Remover ${item.query} do histórico`}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              recordSearch(s.label)
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
