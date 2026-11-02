'use client'

import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Laptop,
  Pause,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sliders,
  Terminal,
} from 'lucide-react'
import type { OutreachStatusResponse } from '@/lib/outreach'

type Props = {
  status: OutreachStatusResponse | null
  onStop: () => Promise<void>
  onOpenSettings: () => void
  loading?: boolean
}

export function OutreachMonitor({ status, onStop, onOpenSettings, loading = false }: Props) {
  const [stopping, setStopping] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  if (!status) return null

  const isRunning = status.is_running
  const sentToday = status.stats.sent_today || 0
  const dailyLimit = status.config.daily_limit || 25
  const pendingCount = status.stats.pending_count || 0
  const progressPercent = Math.min(100, Math.round((sentToday / dailyLimit) * 100))

  async function handleStop() {
    try {
      setStopping(true)
      await onStop()
    } finally {
      setStopping(false)
    }
  }

  // Se a fila não estiver rodando e não tiver nada em andamento, não exibe o monitor flutuante
  if (!isRunning && !status.countdown_seconds && sentToday === 0 && pendingCount === 0) {
    return null
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isRunning
          ? 'border-success/50 bg-gradient-to-r from-success/10 via-card to-success/5 shadow-lg shadow-success/10'
          : 'border-border bg-card/90'
      }`}
    >
      {/* Barra superior de status */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-all ${
                isRunning
                  ? 'bg-success/20 text-success shadow-inner ring-2 ring-success/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isRunning ? (
                <div className="relative flex items-center justify-center">
                  <span className="absolute size-4 animate-ping rounded-full bg-success opacity-75" />
                  <Send className="relative size-5" />
                </div>
              ) : (
                <ShieldCheck className="size-5" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isRunning
                      ? 'border border-success/40 bg-success/20 text-success'
                      : 'border border-border bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      isRunning ? 'bg-success animate-pulse' : 'bg-muted-foreground'
                    }`}
                  />
                  {isRunning ? 'Piloto Automático Ativo' : 'Piloto Automático Pausado'}
                </span>

                {status.keep_awake_active && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <Laptop className="size-3" />
                    PC Protegido contra Suspensão
                  </span>
                )}

                {status.config.telegram_configured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                    Telegram Conectado
                  </span>
                )}
              </div>

              <h3 className="mt-1.5 text-base font-bold text-foreground">
                {isRunning ? (
                  <span>
                    Fila em andamento{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      (Pode sair de casa com tranquilidade)
                    </span>
                  </span>
                ) : (
                  <span>Fila de Disparo em Segundo Plano</span>
                )}
              </h3>

              {status.current_lead ? (
                <p className="mt-0.5 text-xs text-foreground/80">
                  Enviando para:{' '}
                  <span className="font-semibold text-primary">
                    {status.current_lead.company_name || 'Empresa'}
                  </span>{' '}
                  ({status.current_lead.city || 'Sem cidade'}) • {status.current_lead.phone}
                </p>
              ) : status.countdown_seconds !== null ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5 text-amber-400 animate-spin" />
                  Próximo envio seguro estimado em:{' '}
                  <span className="font-bold text-amber-400">{status.countdown_seconds}s</span>{' '}
                  <span className="text-[11px]">(Jitter aleatório anti-ban)</span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pendingCount > 0
                    ? `${pendingCount} leads pendentes aguardando disparo.`
                    : 'Nenhum lead pendente na fila.'}
                </p>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn-press hover-lift inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
              title="Ajustar limites de envio e intervalos"
            >
              <Sliders className="size-3.5" />
              Configurar
            </button>

            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="btn-press hover-lift inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Terminal className="size-3.5" />
              Logs ({status.logs.length})
              {showLogs ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>

            {isRunning ? (
              <button
                type="button"
                onClick={handleStop}
                disabled={stopping || loading}
                className="btn-press hover-lift inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/25 disabled:opacity-50"
              >
                <Pause className="size-3.5" />
                {stopping ? 'Interrompendo...' : 'Interromper Fila'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Barra de Progresso do Limite Diário */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              Progresso Diário:{' '}
              <span className="font-bold text-foreground">
                {sentToday} de {dailyLimit} mensagens disparadas hoje
              </span>
            </span>
            <span className="text-muted-foreground">
              Restantes na fila:{' '}
              <span className="font-semibold text-primary">{pendingCount}</span>
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPercent >= 100
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-success to-primary'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Painel expansível de Logs em Tempo Real */}
      {showLogs && (
        <div className="border-t border-border/80 bg-background/90 p-4 font-mono text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <Terminal className="size-3.5" />
              Logs de Disparo em Segundo Plano
            </span>
            <span className="text-[11px] text-muted-foreground">
              Atualização automática a cada ciclo
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border/60 bg-card/60 p-2.5">
            {status.logs.length === 0 ? (
              <p className="text-muted-foreground">Nenhum evento registrado ainda.</p>
            ) : (
              status.logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[10px] text-muted-foreground shrink-0">{log.timestamp}</span>
                  <span
                    className={`font-semibold shrink-0 ${
                      log.level === 'success'
                        ? 'text-success'
                        : log.level === 'error'
                        ? 'text-destructive'
                        : log.level === 'warning'
                        ? 'text-amber-400'
                        : 'text-primary'
                    }`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-foreground/90 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

