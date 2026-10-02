'use client'

import { AtSign as Instagram, Flame, Globe, LayoutGrid, List, Search } from 'lucide-react'
import type { WebPresence } from '@/lib/leads'

export type PresenceFilter = 'all' | WebPresence
export type ViewMode = 'grid' | 'list'

type Props = {
  counts: Record<PresenceFilter, number>
  filter: PresenceFilter
  onFilterChange: (f: PresenceFilter) => void
  search: string
  onSearchChange: (s: string) => void
  onlyWhatsapp: boolean
  onOnlyWhatsappChange: (v: boolean) => void
  view: ViewMode
  onViewChange: (v: ViewMode) => void
}

const FILTERS: { id: PresenceFilter; label: string; icon?: typeof Flame; active: string }[] = [
  { id: 'all', label: 'Todos', active: 'border-primary/60 bg-primary/15 text-foreground' },
  { id: 'none', label: 'Sem Site', icon: Flame, active: 'border-hot/60 bg-hot/15 text-hot' },
  { id: 'social', label: 'Usa Rede Social', icon: Instagram, active: 'border-social/60 bg-social/15 text-social' },
  { id: 'site', label: 'Tem Site', icon: Globe, active: 'border-primary/60 bg-primary/15 text-primary' },
]

export function FiltersBar(props: Props) {
  const { counts, filter, onFilterChange, search, onSearchChange, onlyWhatsapp, onOnlyWhatsappChange, view, onViewChange } = props

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por presença digital">
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? f.active : 'border-border bg-background/40 text-muted-foreground hover:text-foreground'}`}
            >
              {f.icon && <f.icon className="size-3.5" aria-hidden="true" />}
              {`${f.label} (${counts[f.id]})`}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 lg:w-56 lg:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="lead-search" className="sr-only">
            Buscar por nome ou telefone
          </label>
          <input
            id="lead-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou fone..."
            className="h-9 w-full rounded-full border border-input bg-background/60 pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            role="switch"
            aria-checked={onlyWhatsapp}
            onClick={() => onOnlyWhatsappChange(!onlyWhatsapp)}
            className={`relative h-5 w-9 rounded-full transition ${onlyWhatsapp ? 'bg-success' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${onlyWhatsapp ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
          Apenas WhatsApp
        </label>

        <div className="flex rounded-lg border border-border bg-background/40 p-0.5" role="group" aria-label="Modo de exibição">
          {(['grid', 'list'] as const).map((v) => {
            const Icon = v === 'grid' ? LayoutGrid : List
            return (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={v === 'grid' ? 'Grade' : 'Lista'}
                onClick={() => onViewChange(v)}
                className={`rounded-md p-1.5 transition ${view === v ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
