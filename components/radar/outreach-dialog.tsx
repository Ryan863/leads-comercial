'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Laptop,
  Loader2,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import type { Lead } from '@/lib/leads'
import { generatePitch, getStoredPitchSettings } from '@/lib/pitch-generator'
import {
  type OutreachConfig,
  type OutreachStatusResponse,
  type WhatsAppStatus,
  clearOutreachQueue,
  connectWhatsApp,
  disconnectWhatsApp,
  fetchOutreachStatus,
  fetchWhatsAppStatus,
  resetFailedOutreachLeads,
  startOutreach,
  stopOutreach,
  syncLeadsToOutreach,
  updateOutreachConfig,
} from '@/lib/outreach'

type Props = {
  open: boolean
  onClose: () => void
  currentLeads: Lead[]
  onStatusChange?: (status: OutreachStatusResponse) => void
}

export function OutreachDialog({ open, onClose, currentLeads, onStatusChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [status, setStatus] = useState<OutreachStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncOnlyNoWebsite, setSyncOnlyNoWebsite] = useState(true)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Configurações editáveis
  const [dailyLimit, setDailyLimit] = useState(25)
  const [minDelay, setMinDelay] = useState(70)
  const [maxDelay, setMaxDelay] = useState(190)
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [showTelegram, setShowTelegram] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [configSavedFeedback, setConfigSavedFeedback] = useState(false)

  // Estado do WhatsApp
  const [wppStatus, setWppStatus] = useState<WhatsAppStatus | null>(null)
  const [wppLoading, setWppLoading] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [clearingPending, setClearingPending] = useState(false)

  async function loadWppStatus() {
    try {
      const wpp = await fetchWhatsAppStatus()
      setWppStatus(wpp)
      if (wpp.connected && qrModalOpen) {
        setQrModalOpen(false)
      }
      return wpp
    } catch (e) {
      console.warn('Erro ao verificar WhatsApp:', e)
      return null
    }
  }

  // Carrega status ao abrir o modal
  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal()
      loadStatus()
      loadWppStatus()
    } else {
      dialogRef.current?.close()
      setQrModalOpen(false)
    }
  }, [open])

  // Polling a cada 3s enquanto o modal estiver aberto para checar status do WhatsApp
  useEffect(() => {
    if (!open) return

    const interval = setInterval(async () => {
      const wpp = await loadWppStatus()
      if (wpp?.connected && qrModalOpen) {
        setQrModalOpen(false)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [open, qrModalOpen])

  async function handleConnectWhatsApp() {
    try {
      setWppLoading(true)
      setActionError(null)
      setQrModalOpen(true)
      await connectWhatsApp()
    } catch (err: any) {
      setActionError(err.message || 'Falha ao solicitar conexão do WhatsApp')
      setQrModalOpen(false)
    } finally {
      setWppLoading(false)
    }
  }

  async function handleDisconnectWhatsApp() {
    try {
      setWppLoading(true)
      setActionError(null)
      await disconnectWhatsApp()
      await loadWppStatus()
    } catch (err: any) {
      setActionError(err.message || 'Falha ao desconectar WhatsApp')
    } finally {
      setWppLoading(false)
    }
  }

  async function loadStatus() {
    try {
      setLoading(true)
      const data = await fetchOutreachStatus()
      setStatus(data)
      setDailyLimit(data.config.daily_limit || 25)
      setMinDelay(data.config.min_delay_seconds || 70)
      setMaxDelay(data.config.max_delay_seconds || 190)
      if (data.config.telegram_bot_token) setTelegramToken(data.config.telegram_bot_token)
      if (data.config.telegram_chat_id) setTelegramChatId(data.config.telegram_chat_id)
      onStatusChange?.(data)
    } catch (err: any) {
      console.warn('Erro ao carregar status do outreach:', err)
    } finally {
      setLoading(false)
    }
  }

  // Leads da tela atual: apenas quem NÃO tem site oficial próprio (inclui sem presença 'none' e quem usa redes sociais 'social')
  const leadsWithoutOfficialSite = currentLeads.filter((l) => l.presence !== 'site')
  const leadsToSync = syncOnlyNoWebsite ? leadsWithoutOfficialSite : currentLeads

  const noneCount = currentLeads.filter((l) => l.presence === 'none').length
  const socialCount = currentLeads.filter((l) => l.presence === 'social').length
  const siteCount = currentLeads.filter((l) => l.presence === 'site').length

  async function handleSyncLeads() {
    if (leadsToSync.length === 0) {
      setSyncFeedback('Nenhum lead correspondente na tela para sincronizar.')
      return
    }

    try {
      setSyncing(true)
      setSyncFeedback(null)
      setActionError(null)

      // Carrega preferências do pitch configuradas no manual (Persona, Tom, Remetente, etc.)
      const pitchSettings = getStoredPitchSettings()

      // Gera o texto adaptado individualmente para cada lead (idêntico ao manual)
      const enrichedLeads = leadsToSync.map((lead, idx) => {
        const tailoredPitch = generatePitch(
          lead,
          pitchSettings,
          idx,
          lead.searchQuery || ''
        )
        return {
          ...lead,
          custom_message: tailoredPitch,
        }
      })

      const result = await syncLeadsToOutreach(enrichedLeads as any)
      setSyncFeedback(
        `✅ ${result.synced} leads sincronizados com textos adaptados individualmente! (${result.duplicates_ignored} atualizados na fila)`,
      )
      await loadStatus()
    } catch (err: any) {
      setActionError(err.message || 'Erro ao sincronizar leads')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSaveConfig() {
    try {
      setConfigSaving(true)
      setActionError(null)
      await updateOutreachConfig({
        daily_limit: dailyLimit,
        min_delay_seconds: minDelay,
        max_delay_seconds: maxDelay,
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
      })
      setConfigSavedFeedback(true)
      setTimeout(() => setConfigSavedFeedback(false), 2000)
      await loadStatus()
    } catch (err: any) {
      setActionError(err.message || 'Erro ao salvar configurações')
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleToggleQueue() {
    try {
      setActionError(null)
      setLoading(true)

      // Salva configurações antes de iniciar
      await updateOutreachConfig({
        daily_limit: dailyLimit,
        min_delay_seconds: minDelay,
        max_delay_seconds: maxDelay,
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
      })

      if (status?.is_running) {
        await stopOutreach()
      } else {
        await startOutreach()
      }
      await loadStatus()
    } catch (err: any) {
      setActionError(err.message || 'Falha ao alterar estado da fila')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetFailed() {
    try {
      setLoading(true)
      const res = await resetFailedOutreachLeads()
      setSyncFeedback(`${res.reset_count} leads com falha redefinidos para pendentes.`)
      await loadStatus()
    } catch (err: any) {
      setActionError(err.message || 'Erro ao resetar falhas')
    } finally {
      setLoading(false)
    }
  }

  async function handleClearPending() {
    if (!confirm('Deseja realmente remover todos os leads pendentes da fila?')) {
      return
    }
    try {
      setClearingPending(true)
      setActionError(null)
      const res = await clearOutreachQueue(true)
      setSyncFeedback(`✅ Fila limpa: ${res.deleted_count} leads pendentes foram removidos.`)
      await loadStatus()
    } catch (err: any) {
      setActionError(err.message || 'Falha ao limpar leads pendentes')
    } finally {
      setClearingPending(false)
    }
  }

  const isRunning = status?.is_running || false
  const pendingCount = status?.stats.pending_count || 0
  const sentToday = status?.stats.sent_today || 0
  const failedCount = status?.stats.failed_count || 0

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      className="m-auto w-[min(95vw,40rem)] rounded-2xl border border-border bg-popover p-0 text-foreground shadow-2xl backdrop:bg-background/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-11 items-center justify-center rounded-xl transition-all ${
                isRunning
                  ? 'bg-success/20 text-success shadow-inner ring-2 ring-success/30'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {isRunning ? <Bot className="size-6 animate-pulse" /> : <ShieldCheck className="size-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Modo Piloto Automático
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isRunning
                      ? 'border border-success/40 bg-success/20 text-success'
                      : 'border border-border bg-card text-muted-foreground'
                  }`}
                >
                  {isRunning ? 'Ativo' : 'Pronto'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Disparo autônomo com jitter aleatório, spintax e prevenção de suspensão do Windows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm">
          {/* Mensagens de feedback e erro */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {syncFeedback && (
            <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-xs text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* 1. Indicador de Status do WhatsApp */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
              wppStatus?.connected
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-3">
                {wppStatus?.connected ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex size-3 rounded-full bg-destructive" />
                )}
              </span>
              <span
                className={`text-xs font-bold ${
                  wppStatus?.connected ? 'text-emerald-500' : 'text-destructive'
                }`}
              >
                {wppStatus?.connected
                  ? 'WhatsApp Conectado (Pronto para disparar)'
                  : 'WhatsApp Desconectado'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {wppStatus?.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectWhatsApp}
                  disabled={wppLoading}
                  className="text-xs font-semibold text-muted-foreground hover:text-destructive underline decoration-dotted transition"
                >
                  {wppLoading ? 'Desconectando...' : 'Desconectar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectWhatsApp}
                  disabled={wppLoading || wppStatus?.is_connecting}
                  className="btn-press hover-lift inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
                >
                  {wppLoading || wppStatus?.is_connecting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Abrindo Google Chrome...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="size-3.5" />
                      <span>Conectar WhatsApp (Abrir Chrome)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 2. QR Code Renderizado Diretamente na Tela */}
          {wppStatus?.qr_code && !wppStatus?.connected && (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-primary/50 bg-card/95 p-5 text-center shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
                <QrCode className="size-4" />
                <span>Escaneie este QR Code com o WhatsApp do Celular</span>
              </div>

              <div className="relative rounded-2xl bg-white p-3.5 shadow-xl border-2 border-primary/30">
                <img
                  src={wppStatus.qr_code}
                  alt="QR Code do WhatsApp Web"
                  className="size-56 sm:size-60 object-contain rounded-lg"
                />
              </div>

              <div className="space-y-1 text-xs text-muted-foreground max-w-sm">
                <p className="font-semibold text-foreground">
                  Passo a passo no seu celular:
                </p>
                <p>
                  1. Abra o <b>WhatsApp</b> no celular &gt; Menu (3 pontinhos) ou <b>Configurações</b>
                </p>
                <p>
                  2. Toque em <b>Aparelhos conectados</b> &gt; <b>Conectar um aparelho</b>
                </p>
                <p>
                  3. Aponte a câmera para o QR Code acima.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-semibold text-primary pt-1">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Aguardando leitura do QR Code pelo WhatsApp...</span>
              </div>
            </div>
          )}

          {/* 3. Alerta de geração do QR Code caso ainda esteja carregando */}
          {qrModalOpen && !wppStatus?.qr_code && !wppStatus?.connected && (
            <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-primary/10 p-4 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Smartphone className="size-5 animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-foreground">
                    Gerando QR Code do WhatsApp Web...
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Iniciando sessão do WhatsApp Web. O QR Code aparecerá nesta tela em poucos segundos para você escanear com a câmera.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-medium text-primary">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Conectando e capturando código QR...</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Dispensar aviso"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* Cards de Métricas da Fila Local */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative rounded-xl border border-border bg-card/70 p-3 text-center flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">Pendentes na Fila</span>
                <p className="mt-1 text-xl font-extrabold text-foreground">{pendingCount}</p>
              </div>
              {pendingCount > 0 && !isRunning && (
                <button
                  type="button"
                  onClick={handleClearPending}
                  disabled={clearingPending}
                  className="mt-1 inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-destructive transition"
                  title="Remover pendentes da fila"
                >
                  <Trash2 className="size-2.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card/70 p-3 text-center">
              <span className="text-[11px] font-medium text-muted-foreground">Enviados Hoje</span>
              <p className="mt-1 text-xl font-extrabold text-success">
                {sentToday} <span className="text-xs text-muted-foreground">/ {dailyLimit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/70 p-3 text-center">
              <span className="text-[11px] font-medium text-muted-foreground">Com Falha</span>
              <p className="mt-1 text-xl font-extrabold text-destructive">{failedCount}</p>
            </div>
          </div>

          {/* Ação para remover leads pendentes da fila */}
          {pendingCount > 0 && !isRunning && (
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/40 px-3.5 py-2.5 text-xs animate-in fade-in duration-150">
              <span className="text-muted-foreground">
                Existem <b>{pendingCount}</b> leads pendentes na fila.
              </span>
              <button
                type="button"
                onClick={handleClearPending}
                disabled={clearingPending}
                className="btn-press hover-lift inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
              >
                {clearingPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>Remover Pendentes da Fila</span>
              </button>
            </div>
          )}

          {/* Bloco 1: Sincronização dos leads da tela */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  Leads Encontrados no Radar Atual
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {currentLeads.length} leads na tela ({leadsWithoutOfficialSite.length} sem site próprio)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncOnlyNoWebsite}
                  onChange={(e) => setSyncOnlyNoWebsite(e.target.checked)}
                  className="rounded border-border accent-primary size-4"
                />
                <span>
                  Sincronizar apenas comércios <b>sem site próprio</b> ({noneCount} sem presença + {socialCount} em redes sociais, ignorando {siteCount} com site)
                </span>
              </label>

              <button
                type="button"
                onClick={handleSyncLeads}
                disabled={syncing || leadsToSync.length === 0}
                className="btn-press hover-lift inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-40 shrink-0"
              >
                {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Alimentar Fila ({leadsToSync.length})
              </button>
            </div>
          </div>

          {/* Bloco 2: Governança de Cadência e Sliders de Segurança */}
          <div className="space-y-4 rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Configurações de Segurança e Anti-Banimento
              </h3>
            </div>

            {/* Slider de Limite Diário */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Limite Diário Máximo de Disparos:
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    dailyLimit <= 25
                      ? 'bg-success/20 text-success'
                      : dailyLimit <= 35
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-destructive/20 text-destructive'
                  }`}
                >
                  {dailyLimit} mensagens / dia
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Trava rígida: o sistema encerra automaticamente os disparos do dia ao bater esta meta para manter seu WhatsApp 100% seguro.
              </p>
            </div>

            {/* Sliders de Intervalo com Jitter Humano */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Intervalo Aleatório entre Envios (Jitter):
                </span>
                <span className="font-mono font-bold text-primary">
                  {minDelay}s a {maxDelay}s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Tempo Mínimo: {minDelay}s
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="5"
                    value={minDelay}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setMinDelay(val)
                      if (maxDelay <= val) setMaxDelay(val + 30)
                    }}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Tempo Máximo: {maxDelay}s
                  </label>
                  <input
                    type="range"
                    min="70"
                    max="300"
                    step="10"
                    value={maxDelay}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val > minDelay) setMaxDelay(val)
                    }}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Proibido intervalo fixo: a cada lead, o worker sorteia um tempo aleatório entre {minDelay}s e {maxDelay}s, emulando perfeitamente a digitação humana.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={configSaving}
                className="btn-press hover-lift inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
              >
                {configSaving ? <Loader2 className="size-3 animate-spin" /> : configSavedFeedback ? <Check className="size-3 text-success" /> : null}
                {configSavedFeedback ? 'Salvo!' : 'Salvar Preferências'}
              </button>
            </div>
          </div>

          {/* Banner de Proteções Ativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 p-3">
              <ShieldCheck className="size-4 text-success shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-success block">Spintax & Anti-Ban</span>
                <span className="text-[11px] text-muted-foreground">
                  Cada mensagem varia saudações, ganchos e fechamentos para nunca repetir texto idêntico.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <Laptop className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-primary block">Windows Keep-Awake</span>
                <span className="text-[11px] text-muted-foreground">
                  O PC fica impedido de hibernar ou suspender enquanto a fila estiver rodando.
                </span>
              </div>
            </div>
          </div>

          {/* Bloco 3: Alertas Remotos via Telegram (Opcional) */}
          <div className="rounded-xl border border-border bg-card/40 p-3.5 space-y-2.5">
            <button
              type="button"
              onClick={() => setShowTelegram(!showTelegram)}
              className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Send className="size-3.5 text-sky-400" />
                Alertas Remotos no Telegram (Receba avisos no celular enquanto estiver fora)
              </span>
              {showTelegram ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showTelegram && (
              <div className="pt-2 space-y-3 text-xs border-t border-border/40">
                <p className="text-[11px] text-muted-foreground">
                  Configure seu bot para ser notificado ao iniciar a fila, a cada 5 disparos e ao bater a meta do dia.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Telegram Bot Token
                    </label>
                    <input
                      type="password"
                      placeholder="Ex: 123456:ABC-DEF1234..."
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Chat ID
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 987654321"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="btn-press rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent"
                  >
                    Salvar Token Telegram
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ação secundária: reprocessar falhas se houver */}
          {failedCount > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <span className="text-muted-foreground">
                Existem <b>{failedCount}</b> leads marcados com falha.
              </span>
              <button
                type="button"
                onClick={handleResetFailed}
                disabled={loading}
                className="btn-press rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1 font-semibold text-destructive hover:bg-destructive/20"
              >
                Tentar Novamente os {failedCount} Leads
              </button>
            </div>
          )}
        </div>

        {/* Footer / Botão Principal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border p-5 bg-card/60">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            {isRunning ? (
              <span className="text-success font-medium flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success animate-ping" />
                Fila rodando ativamente em segundo plano
              </span>
            ) : !wppStatus?.connected ? (
              <span className="text-destructive font-medium flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-destructive" />
                Conecte o WhatsApp acima para habilitar o envio seguro
              </span>
            ) : pendingCount > 0 ? (
              <span className="text-foreground">Pronto para iniciar com <b>{pendingCount}</b> leads pendentes.</span>
            ) : (
              <span>Adicione leads à fila para começar.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="btn-press flex-1 sm:flex-initial rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
            >
              Fechar
            </button>

            {isRunning ? (
              <button
                type="button"
                onClick={handleToggleQueue}
                disabled={loading}
                className="btn-press hover-lift flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/50 bg-destructive text-destructive-foreground px-5 py-2.5 text-xs font-bold shadow-lg transition hover:brightness-110"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
                Interromper Fila
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleQueue}
                disabled={loading || pendingCount === 0 || !wppStatus?.connected}
                title={!wppStatus?.connected ? 'Conecte o WhatsApp para iniciar a fila' : undefined}
                className="btn-press hover-lift flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-success text-background px-6 py-2.5 text-xs font-extrabold shadow-lg shadow-success/20 transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
                Iniciar Fila Segura
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}

