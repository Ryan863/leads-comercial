'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Copy,
  Dices,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'

function InstagramIcon({ className = 'size-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}
import type { Lead } from '@/lib/leads'
import {
  generatePitch,
  getStoredPitchSettings,
  isLeadInSameCity,
  type PitchSettings,
  type PitchTone,
  type SenderPersona,
} from '@/lib/pitch-generator'
import { PitchConfigDialog } from './pitch-config-dialog'

type Props = {
  lead: Lead | null
  onClose: () => void
}

export function LeadDetailDialog({ lead, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [variationIndex, setVariationIndex] = useState(0)
  const [selectedTone, setSelectedTone] = useState<PitchTone>('consultative')
  const [selectedPersona, setSelectedPersona] = useState<SenderPersona>('auto')
  const [loadingAi, setLoadingAi] = useState(false)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showAiInput, setShowAiInput] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  // Quando o lead muda ou o modal abre, gera a mensagem inicial adaptada
  useEffect(() => {
    if (lead) {
      const settings = getStoredPitchSettings()
      setSelectedTone(settings.tone || 'consultative')
      setSelectedPersona(settings.persona || 'auto')
      setVariationIndex(0)
      setIsAiGenerated(false)
      const initialText = generatePitch(
        lead,
        { ...settings, persona: settings.persona || 'auto', tone: settings.tone || 'consultative' },
        0,
      )
      setMessage(initialText)
    }
  }, [lead])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (lead && !dialog.open) dialog.showModal()
    if (!lead && dialog.open) dialog.close()
  }, [lead])

  function handlePersonaChange(persona: SenderPersona) {
    if (!lead) return
    setSelectedPersona(persona)
    const settings = getStoredPitchSettings()
    const nextText = generatePitch(lead, { ...settings, persona, tone: selectedTone }, variationIndex)
    setMessage(nextText)
    setIsAiGenerated(false)
  }

  function handleToneChange(tone: PitchTone) {
    if (!lead) return
    setSelectedTone(tone)
    const settings = getStoredPitchSettings()
    const nextText = generatePitch(lead, { ...settings, persona: selectedPersona, tone }, variationIndex)
    setMessage(nextText)
    setIsAiGenerated(false)
  }

  function handleNextVariation() {
    if (!lead) return
    const nextIdx = variationIndex + 1
    setVariationIndex(nextIdx)
    const settings = getStoredPitchSettings()
    const nextText = generatePitch(lead, { ...settings, persona: selectedPersona, tone: selectedTone }, nextIdx)
    setMessage(nextText)
    setIsAiGenerated(false)
  }

  async function handleAiRefine() {
    if (!lead) return
    setLoadingAi(true)
    try {
      const settings = getStoredPitchSettings()
      const res = await fetch('/api/ai-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead,
          settings: { ...settings, persona: selectedPersona, tone: selectedTone },
          customInstructions: customPrompt.trim() || undefined,
          variationIndex,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.pitch) {
          setMessage(data.pitch)
          setIsAiGenerated(data.isAi ?? true)
          setShowAiInput(false)
        }
      }
    } catch (err) {
      console.warn('Erro ao chamar IA, mantendo gerador nativo:', err)
    } finally {
      setLoadingAi(false)
    }
  }

  const phoneDigits = lead?.phone?.replace(/\D/g, '') || ''
  const waUrl = lead?.whatsapp && phoneDigits
    ? `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(message)}`
    : null

  const storedSettings = typeof window !== 'undefined' ? getStoredPitchSettings() : null
  const baseCity = storedSettings?.senderCity || 'Videira'
  const isLocal = lead ? isLeadInSameCity(lead.address, baseCity) : false
  const hasInstagram = lead?.presence === 'social' || (lead?.website && /instagram\.com/i.test(lead.website))

  return (
    <>
      <dialog
        ref={ref}
        onClose={onClose}
        onClick={(e) => e.target === ref.current && onClose()}
        className="m-auto w-[min(94vw,44rem)] rounded-2xl border border-border bg-popover p-0 text-foreground shadow-2xl backdrop:bg-background/80 backdrop:backdrop-blur-sm"
      >
        {lead && (
          <div className="flex max-h-[90vh] flex-col overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between border-b border-border bg-card/60 p-5">
              <div className="min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-bold text-foreground">{lead.name}</h2>
                  <span className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {lead.category}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{lead.address}</span>
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setConfigOpen(true)}
                  title="Configurar remetente e IA"
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <Settings className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
              {/* Badges de dados rápidos */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-background/50 p-2.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Telefone</span>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-primary">{lead.phone || 'Sem telefone'}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-2.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Presença Web</span>
                  <p className="mt-0.5 text-xs font-semibold">
                    {hasInstagram ? (
                      <span className="inline-flex items-center gap-1 text-violet-400">
                        <InstagramIcon className="size-3" /> Tem Instagram
                      </span>
                    ) : lead.presence === 'none' ? (
                      <span className="text-hot font-bold">Sem Site (Oportunidade)</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Globe className="size-3" /> Tem Site Oficial
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-2.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Avaliação Google</span>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold">
                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                    {lead.rating != null ? `${lead.rating.toFixed(1)} (${lead.reviews})` : 'Sem nota'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-2.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Localização</span>
                  <p className="mt-0.5 text-xs font-semibold">
                    {isLocal ? (
                      <span className="text-emerald-400">Local ({baseCity})</span>
                    ) : (
                      <span className="text-sky-400">Fora de {baseCity}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Seção Principal: Mensagem de Abordagem Pronta & Adaptada */}
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                      <Sparkles className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                        Mensagem de Abordagem Adaptada
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Texto personalizado considerando presença digital e localização
                      </p>
                    </div>
                  </div>

                  {/* Badges de contexto ativo */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isLocal ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        <MapPin className="size-2.5" /> Gancho local ({baseCity})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                        🌍 Fora de {baseCity} • Moradia omitida
                      </span>
                    )}

                    {hasInstagram && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                        <InstagramIcon className="size-2.5" /> Foco: Instagram → WhatsApp
                      </span>
                    )}

                    {isAiGenerated && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Sparkles className="size-2.5" /> IA
                      </span>
                    )}
                  </div>
                </div>

                {/* Seletores de Persona (Ryan / Equipe Rvll / Dev) */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Assinatura:</span>
                    {(
                      [
                        { id: 'auto' as SenderPersona, label: 'Auto (Adapta)' },
                        { id: 'ryan' as SenderPersona, label: 'Ryan' },
                        { id: 'rvll' as SenderPersona, label: 'Equipe Rvll' },
                        { id: 'dev' as SenderPersona, label: 'Dev Web' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePersonaChange(p.id)}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                          selectedPersona === p.id
                            ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                            : 'border border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Tom:</span>
                    {(
                      [
                        { id: 'consultative' as PitchTone, label: 'Acolhedor' },
                        { id: 'preview' as PitchTone, label: 'Prévia' },
                        { id: 'direct' as PitchTone, label: 'Direto' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToneChange(t.id)}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                          selectedTone === t.id
                            ? 'border border-primary/50 bg-primary/20 text-primary font-semibold'
                            : 'border border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={handleNextVariation}
                      title="Gera outra variação de abertura e fechamento"
                      className="btn-press ml-1 inline-flex items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                    >
                      <Dices className="size-3 text-primary" />
                      Variação
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAiInput((prev) => !prev)}
                      className="btn-press inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                    >
                      <Sparkles className="size-3" />
                      {showAiInput ? 'Ocultar' : 'IA'}
                    </button>
                  </div>
                </div>

                {/* Caixa de input opcional para IA */}
                {showAiInput && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-primary/30 bg-background/80 p-3">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Instrução opcional para o agente de IA:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Ex: Foque no agendamento aos sábados ou destaque fotos de tratamentos"
                        className="h-8 flex-1 rounded-md border border-input bg-card px-2.5 text-xs outline-none focus:border-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleAiRefine()}
                      />
                      <button
                        type="button"
                        onClick={handleAiRefine}
                        disabled={loadingAi}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        {loadingAi ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                        {loadingAi ? 'Gerando...' : 'Aplicar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Editor / Visualizador da Mensagem */}
                <div className="relative mt-3">
                  <textarea
                    rows={7}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    aria-label="Texto da mensagem de abordagem"
                    className="w-full resize-y rounded-xl border border-border bg-background p-3.5 font-sans text-xs leading-relaxed text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>💡 O texto já está pronto e adaptado. Você pode editar qualquer palavra antes de enviar.</span>
                    <span>{message.length} caracteres</span>
                  </div>
                </div>

                {/* Ações principais de envio e cópia */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(message)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1600)
                    }}
                    className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:bg-accent"
                  >
                    {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4 text-muted-foreground" />}
                    {copied ? 'Mensagem Copiada!' : 'Copiar Texto'}
                  </button>

                  <div className="flex items-center gap-2">
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-press inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-xs font-bold text-background shadow-sm transition hover:brightness-110"
                      >
                        <MessageCircle className="size-4" />
                        Chamar no WhatsApp com este Texto
                      </a>
                    ) : (
                      <span className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                        Número sem WhatsApp verificado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </dialog>

      <PitchConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={() => {
          if (lead) {
            const settings = getStoredPitchSettings()
            setMessage(generatePitch(lead, settings, variationIndex))
          }
        }}
      />
    </>
  )
}
