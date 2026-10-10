'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Cpu, HelpCircle, Loader2, Radio, Sparkles, Zap } from 'lucide-react'
import { generateLeads, type Lead } from '@/lib/leads'
import { getStoredPitchSettings, type PitchSettings, DEFAULT_PITCH_SETTINGS } from '@/lib/pitch-generator'
import { SearchPanel } from './search-panel'
import { StatsCards } from './stats-cards'
import { FiltersBar, type PresenceFilter, type ViewMode } from './filters-bar'
import { LeadCard, LeadRow } from './lead-card'
import { ExportActions } from './export-actions'
import { IdleState, NoResults, ScanningState } from './radar-states'
import { LeadDetailDialog } from './lead-detail-dialog'
import { PitchConfigDialog } from './pitch-config-dialog'

const DEMO_QUERY = 'Pizzarias em Videira - SC'

export function RadarApp() {
  const [query, setQuery] = useState(DEMO_QUERY)
  const [scannedQuery, setScannedQuery] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [leads, setLeads] = useState<Lead[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [filter, setFilter] = useState<PresenceFilter>('all')
  const [search, setSearch] = useState('')
  const [onlyWhatsapp, setOnlyWhatsapp] = useState(false)
  const [view, setView] = useState<ViewMode>('grid')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [pitchSettings, setPitchSettings] = useState<PitchSettings>(DEFAULT_PITCH_SETTINGS)

  useEffect(() => {
    setPitchSettings(getStoredPitchSettings())
  }, [])

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  function stopAllScans() {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
    if (pollingTimer.current) {
      clearInterval(pollingTimer.current)
      pollingTimer.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  // Verifica status do backend Python/FastAPI ao carregar
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/backend/health', { method: 'GET' })
        if (res.ok) {
          setIsBackendOnline(true)
        } else {
          setIsBackendOnline(false)
        }
      } catch {
        setIsBackendOnline(false)
      }
    }
    checkHealth()
  }, [])

  // Limpa conexões pendentes no unmount
  useEffect(() => {
    return () => {
      stopAllScans()
    }
  }, [])

  async function runScan(q = query, forceDemo = false) {
    const term = q.trim()
    if (!term) return

    stopAllScans()

    setFilter('all')
    setSearch('')
    setScannedQuery(term)
    setScanning(true)
    setProgress(10)
    setLeads([])

    // Modo demonstração instantâneo forçado pelo usuário
    if (forceDemo) {
      setLeads(generateLeads(term, quantity))
      setScanning(false)
      setProgress(100)
      return
    }

    // Se o backend estiver online, inicia a raspagem real via streaming SSE + polling sincronizado
    if (isBackendOnline) {
      // Animação de progresso suave durante inicialização do motor Playwright
      timer.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 28) return prev + 2
          return prev
        })
      }, 500)

      try {
        const res = await fetch('/api/backend/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: term, quantity, source: 'auto' }),
        })

        if (!res.ok) {
          throw new Error('Falha ao iniciar busca no backend')
        }

        const data = await res.json()
        const jobId = data.id
        setActiveJobId(jobId)

        // Função auxiliar para incorporar leads sem duplicatas
        const mergeLeads = (newLeads: Lead[]) => {
          setLeads((prev) => {
            const combined = [...prev]
            for (const item of newLeads) {
              const alreadyHasId = combined.some((c) => c.id === item.id)
              const phoneDigits = item.phone?.replace(/\D/g, '')
              const alreadyHasPhone = phoneDigits && phoneDigits.length >= 8 && combined.some((c) => c.phone?.replace(/\D/g, '') === phoneDigits)
              if (!alreadyHasId && !alreadyHasPhone) {
                combined.push(item)
              }
            }
            return combined
          })
        }

        // 1. Conexão Server-Sent Events (SSE) em tempo real
        try {
          const eventSource = new EventSource(`/api/backend/search/${jobId}/stream`)
          eventSourceRef.current = eventSource

          eventSource.onmessage = (e) => {
            try {
              const payload = JSON.parse(e.data)
              if (payload.type === 'lead' && payload.data) {
                mergeLeads([payload.data])
                if (payload.current && payload.total) {
                  const pct = Math.max(30, Math.min(95, Math.round((payload.current / payload.total) * 100)))
                  setProgress(pct)
                }
              } else if (payload.type === 'done') {
                stopAllScans()
                setProgress(100)
                setScanning(false)
              } else if (payload.type === 'error') {
                console.warn('Alerta do scraper:', payload.message)
              }
            } catch {
              // Ignore parse errors (e.g. comments/heartbeats)
            }
          }

          eventSource.onerror = () => {
            // Em caso de instabilidade na conexão SSE, mantém o polling como salvaguarda
            if (eventSourceRef.current) {
              eventSourceRef.current.close()
              eventSourceRef.current = null
            }
          }
        } catch (sseErr) {
          console.warn('Erro ao abrir EventSource, utilizando polling de redundância.', sseErr)
        }

        // 2. Polling ativo como redundância garantida (elimina qualquer congelamento em 5%)
        let pollCount = 0
        pollingTimer.current = setInterval(async () => {
          pollCount += 1
          try {
            const statusRes = await fetch(`/api/backend/search/${jobId}/status`, { cache: 'no-store' })
            if (statusRes.ok) {
              const statusData = await statusRes.json()
              if (statusData.leads && statusData.leads.length > 0) {
                mergeLeads(statusData.leads)
                const count = statusData.leads.length
                const pct = Math.max(30, Math.min(95, Math.round((count / quantity) * 100)))
                setProgress(pct)
              }

              if (statusData.status === 'completed') {
                stopAllScans()
                setProgress(100)
                setScanning(false)
                return
              }

              if (statusData.status === 'error') {
                stopAllScans()
                setProgress(100)
                setScanning(false)
                return
              }
            }
          } catch (pollErr) {
            console.debug('Polling check falhou momentaneamente:', pollErr)
          }

          // Timeout de segurança após 50 segundos para nunca travar a tela
          if (pollCount > 40) {
            stopAllScans()
            setProgress(100)
            setScanning(false)
          }
        }, 1200)

        return
      } catch (err) {
        console.warn('Backend inacessível, utilizando simulação offline.', err)
        setIsBackendOnline(false)
        stopAllScans()
      }
    }

    // Fallback de simulação caso o backend Python ainda não tenha sido iniciado no terminal
    timer.current = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + Math.ceil(Math.random() * 12))
        if (next >= 100 && timer.current) {
          clearInterval(timer.current)
          timer.current = null
          setTimeout(() => {
            setLeads(generateLeads(term, quantity))
            setScanning(false)
          }, 250)
        }
        return next
      })
    }, 160)
  }

  const counts = useMemo(
    () => ({
      all: leads.length,
      none: leads.filter((l) => l.presence === 'none').length,
      social: leads.filter((l) => l.presence === 'social').length,
      site: leads.filter((l) => l.presence === 'site').length,
    }),
    [leads],
  )

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase()
    const digits = s.replace(/\D/g, '')
    return leads.filter((l) => {
      if (filter !== 'all' && l.presence !== filter) return false
      if (onlyWhatsapp && !l.whatsapp) return false
      if (!s) return true
      return l.name.toLowerCase().includes(s) || (digits.length > 0 && l.phone.replace(/\D/g, '').includes(digits))
    })
  }, [leads, filter, search, onlyWhatsapp])

  return (
    <div className="space-y-6">
      {/* Top Header & Engine Status Badge */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <Radio className="size-3" aria-hidden="true" />
              Radar em Tempo Real
            </span>

            {/* Badge de status do motor de raspagem */}
            {isBackendOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
                <span className="size-1.5 rounded-full bg-success animate-ping" />
                Motor Playwright Ativo (Zero Custo)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Cpu className="size-3" aria-hidden="true" />
                Modo Offline • Execute o backend Python para dados ao vivo
              </span>
            )}
          </div>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Sondar • Radar de Leads B2B
          </h1>
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            Varra empresas diretamente dos mapas sem custos de API, filtre quem não tem site e abra conversas imediatas no WhatsApp. Projeto gratuito sem mensalidades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            title="Personalize seu nome, cidade e IA de mensagens"
            className="btn-press hover-lift inline-flex w-fit items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Automação de Mensagens ({pitchSettings.senderName || 'Ryan'} • {pitchSettings.senderCity || 'Videira'})
          </button>

          <button
            type="button"
            onClick={() => {
              setQuery(DEMO_QUERY)
              runScan(DEMO_QUERY, true)
            }}
            className="btn-press hover-lift inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card/70 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:bg-accent"
          >
            <Zap className="size-3.5 text-yellow-400" aria-hidden="true" />
            Demonstração Instantânea
          </button>
        </div>
      </div>

      <SearchPanel
        query={query}
        quantity={quantity}
        scanning={scanning}
        onQueryChange={setQuery}
        onQuantityChange={setQuantity}
        onScan={(q) => runScan(q)}
      />

      <StatsCards leads={leads} />

      {scanning ? (
        <ScanningState query={scannedQuery} progress={progress} />
      ) : leads.length === 0 ? (
        <IdleState
          onDemo={() => {
            setQuery(DEMO_QUERY)
            runScan(DEMO_QUERY, true)
          }}
        />
      ) : (
        <>
          <FiltersBar
            counts={counts}
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            onlyWhatsapp={onlyWhatsapp}
            onOnlyWhatsappChange={setOnlyWhatsapp}
            view={view}
            onViewChange={setView}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Exibindo <span className="font-semibold text-foreground">{visible.length}</span> leads encontrados
              <span className="hidden md:inline">{` para "${scannedQuery}"`}</span>
            </p>
            <ExportActions leads={visible} query={scannedQuery || query} />
          </div>

          {visible.length === 0 ? (
            <NoResults />
          ) : view === 'grid' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onNote={setSelected} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((lead) => (
                <LeadRow key={lead.id} lead={lead} onNote={setSelected} />
              ))}
            </div>
          )}
        </>
      )}

      <LeadDetailDialog lead={selected} onClose={() => setSelected(null)} />
      <PitchConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={() => setPitchSettings(getStoredPitchSettings())}
      />
    </div>
  )
}
