import { Radar, SearchX } from 'lucide-react'

export function ScanningState({ query, progress }: { query: string; progress: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/50 px-6 py-16 text-center" role="status">
      <div className="relative flex size-40 items-center justify-center rounded-full border border-primary/30">
        <div className="absolute inset-5 rounded-full border border-primary/20" />
        <div className="absolute inset-12 rounded-full border border-primary/20" />
        <div className="absolute inset-0 animate-radar rounded-full bg-[conic-gradient(from_0deg,transparent_70%,oklch(0.6_0.2_262/0.7))]" />
        <span className="absolute left-7 top-9 size-2 animate-ping-slow rounded-full bg-hot" />
        <span className="absolute bottom-10 right-7 size-2 animate-ping-slow rounded-full bg-success [animation-delay:0.6s]" />
        <span className="absolute right-12 top-5 size-2 animate-ping-slow rounded-full bg-social [animation-delay:1.2s]" />
        <span className="size-3 rounded-full bg-primary glow-primary" />
      </div>
      <p className="mt-8 font-semibold">Varrendo o Google Maps...</p>
      <p className="mt-1 text-sm text-muted-foreground">{`Buscando "${query}"`}</p>
      <div className="mt-5 h-1.5 w-64 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 font-mono text-xs text-muted-foreground">{`${progress}%`}</p>
    </div>
  )
}

export function IdleState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Radar className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-5 font-semibold">Nenhuma varredura ainda</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Digite um nicho e uma cidade acima e clique em Iniciar Varredura, ou carregue uma demonstração.
      </p>
      <button type="button" onClick={onDemo} className="mt-5 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm hover:bg-accent">
        Carregar demonstração
      </button>
    </div>
  )
}

export function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-14 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 font-semibold">Nenhum lead com esses filtros</p>
      <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou a busca para ver mais resultados.</p>
    </div>
  )
}
