'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Check,
  Copy,
  Dices,
  ExternalLink,
  Globe,
  Key,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Settings,
  Sparkles,
  Star,
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
  extractSpecialtyInfo,
  generatePitch,
  getStoredPitchSettings,
  saveStoredPitchSettings,
  isLeadInSameCity,
  SUPPORTED_LANGUAGES,
  type PitchLanguage,
  type PitchSettings,
  type PitchTone,
  type SenderPersona,
} from '@/lib/pitch-generator'
import { PitchConfigDialog } from './pitch-config-dialog'

type Props = {
  lead: Lead | null
  searchQuery?: string
  onClose: () => void
}

export function LeadDetailDialog({ lead, searchQuery, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [localFallback, setLocalFallback] = useState('')
  const [variationIndex, setVariationIndex] = useState(0)
  const [selectedTone, setSelectedTone] = useState<PitchTone>('consultative')
  const [selectedPersona, setSelectedPersona] = useState<SenderPersona>('auto')
  const [selectedLanguage, setSelectedLanguage] = useState<PitchLanguage>('auto')
  const [loadingAi, setLoadingAi] = useState(false)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showAiInput, setShowAiInput] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [serverHasKey, setServerHasKey] = useState(false)
  const [savedPersonaFeedback, setSavedPersonaFeedback] = useState(false)

  const effectiveQuery = lead?.searchQuery || searchQuery || lead?.searchedNiche || ''

  // Verifica se há chave Gemini no servidor
  useEffect(() => {
    fetch('/api/ai-pitch')
      .then((r) => r.json())
      .then((d) => {
        if (d.hasServerKey) setServerHasKey(true)
      })
      .catch(() => {})
  }, [])

  // Função central para chamada do Gemini em tempo real
  const fetchGeminiPitch = useCallback(async (
    targetLead: Lead,
    settings: PitchSettings,
    lang: PitchLanguage,
    persona: SenderPersona,
    tone: PitchTone,
    varIdx: number,
    customInst?: string,
    queryCtx?: string,
  ) => {
    setLoadingAi(true)
    try {
      const res = await fetch('/api/ai-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            ...targetLead,
            searchQuery: targetLead.searchQuery || queryCtx,
          },
          settings: { ...settings, persona, tone, language: lang },
          customInstructions: customInst,
          variationIndex: varIdx,
          searchQuery: queryCtx || targetLead.searchQuery,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.pitch) {
          setMessage(data.pitch)
          setIsAiGenerated(Boolean(data.isAi))
          setShowAiInput(false)
        }
      }
    } catch (err) {
      console.warn('Erro na chamada Gemini em tempo real, mantendo motor nativo:', err)
    } finally {
      setLoadingAi(false)
    }
  }, [])

  // Quando o lead muda ou o modal abre, gera a mensagem inicial adaptada e dispara IA se disponível
  useEffect(() => {
    if (lead) {
      const settings = getStoredPitchSettings()
      setSelectedTone(settings.tone || 'consultative')
      const effectivePersona = settings.persona || 'ryan'
      setSelectedPersona(effectivePersona)
      const initialLang = (settings.language && settings.language !== 'auto') ? settings.language : 'auto'
      setSelectedLanguage(initialLang)
      setVariationIndex(0)
      setIsAiGenerated(false)

      let savedMsg = lead.id && typeof window !== 'undefined' ? localStorage.getItem(`sondar_custom_msg_${lead.id}`) : null
      // Se havia texto antigo salvo com o fallback genérico "estabelecimentos de comércio e serviços", descarta para regenerar adaptado
      if (savedMsg && /com[eé]rcio e servi[cç]os/i.test(savedMsg)) {
        localStorage.removeItem(`sondar_custom_msg_${lead.id}`)
        savedMsg = null
      }

      const initialText = generatePitch(
        lead,
        {
          ...settings,
          persona: effectivePersona,
          tone: settings.tone || 'consultative',
          language: initialLang,
        },
        0,
        effectiveQuery,
      )
      setLocalFallback(initialText)

      if (savedMsg) {
        setMessage(savedMsg)
      } else {
        setMessage(initialText)
      }

      const hasKey = Boolean(settings.geminiApiKey?.trim() || serverHasKey)
      if (hasKey && settings.autoGemini !== false && !savedMsg) {
        fetchGeminiPitch(lead, settings, initialLang, effectivePersona, settings.tone || 'consultative', 0, undefined, effectiveQuery)
      }
    }
  }, [lead, effectiveQuery, serverHasKey, fetchGeminiPitch])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (lead && !dialog.open) dialog.showModal()
    if (!lead && dialog.open) dialog.close()
  }, [lead])

  function handleMessageChange(val: string) {
    setMessage(val)
    if (lead?.id && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`sondar_custom_msg_${lead.id}`, val)
      } catch {}
    }
  }

  function handlePersonaChange(persona: SenderPersona) {
    if (!lead) return
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`sondar_custom_msg_${lead.id}`)
    }
    setSelectedPersona(persona)
    const currentSettings = getStoredPitchSettings()
    const updatedSettings: PitchSettings = { ...currentSettings, persona }
    saveStoredPitchSettings(updatedSettings)

    setSavedPersonaFeedback(true)
    setTimeout(() => setSavedPersonaFeedback(false), 2000)

    const nextText = generatePitch(
      lead,
      { ...updatedSettings, tone: selectedTone, language: selectedLanguage },
      variationIndex,
      effectiveQuery,
    )
    setLocalFallback(nextText)

    const hasKey = Boolean(updatedSettings.geminiApiKey?.trim() || serverHasKey)
    if (hasKey && updatedSettings.autoGemini !== false) {
      fetchGeminiPitch(lead, updatedSettings, selectedLanguage, persona, selectedTone, variationIndex, undefined, effectiveQuery)
    } else {
      setMessage(nextText)
      setIsAiGenerated(false)
    }
  }

  function handleToneChange(tone: PitchTone) {
    if (!lead) return
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`sondar_custom_msg_${lead.id}`)
    }
    setSelectedTone(tone)
    const currentSettings = getStoredPitchSettings()
    const updatedSettings: PitchSettings = { ...currentSettings, tone }
    saveStoredPitchSettings(updatedSettings)

    const nextText = generatePitch(
      lead,
      { ...updatedSettings, persona: selectedPersona, tone, language: selectedLanguage },
      variationIndex,
      effectiveQuery,
    )
    setLocalFallback(nextText)

    const hasKey = Boolean(updatedSettings.geminiApiKey?.trim() || serverHasKey)
    if (hasKey && updatedSettings.autoGemini !== false) {
      fetchGeminiPitch(lead, updatedSettings, selectedLanguage, selectedPersona, tone, variationIndex, undefined, effectiveQuery)
    } else {
      setMessage(nextText)
      setIsAiGenerated(false)
    }
  }

  function handleLanguageChange(lang: PitchLanguage) {
    if (!lead) return
    setSelectedLanguage(lang)
    const currentSettings = getStoredPitchSettings()
    const updatedSettings: PitchSettings = { ...currentSettings, language: lang }
    saveStoredPitchSettings(updatedSettings)

    const nextText = generatePitch(
      lead,
      { ...updatedSettings, persona: selectedPersona, tone: selectedTone, language: lang },
      variationIndex,
      effectiveQuery,
    )
    setLocalFallback(nextText)

    const hasKey = Boolean(updatedSettings.geminiApiKey?.trim() || serverHasKey)
    if (hasKey && updatedSettings.autoGemini !== false) {
      fetchGeminiPitch(lead, updatedSettings, lang, selectedPersona, selectedTone, variationIndex, undefined, effectiveQuery)
    } else {
      setMessage(nextText)
      setIsAiGenerated(false)
    }
  }

  function handleNextVariation() {
    if (!lead) return
    const nextIdx = variationIndex + 1
    setVariationIndex(nextIdx)
    const settings = getStoredPitchSettings()
    const nextText = generatePitch(
      lead,
      { ...settings, persona: selectedPersona, tone: selectedTone, language: selectedLanguage },
      nextIdx,
      effectiveQuery,
    )
    setLocalFallback(nextText)

    const hasKey = Boolean(settings.geminiApiKey?.trim() || serverHasKey)
    if (hasKey && isAiGenerated) {
      fetchGeminiPitch(lead, settings, selectedLanguage, selectedPersona, selectedTone, nextIdx, undefined, effectiveQuery)
    } else {
      setMessage(nextText)
      setIsAiGenerated(false)
    }
  }

  async function handleAiRefine() {
    if (!lead) return
    const settings = getStoredPitchSettings()
    fetchGeminiPitch(
      lead,
      settings,
      selectedLanguage,
      selectedPersona,
      selectedTone,
      variationIndex,
      customPrompt.trim() || undefined,
      effectiveQuery,
    )
  }

  const rawDigits = lead?.phone?.replace(/\D/g, '') || ''
  let cleanDigits = rawDigits
  if (lead?.phone && !lead.phone.startsWith('+') && !rawDigits.startsWith('55') && (rawDigits.length === 10 || rawDigits.length === 11)) {
    cleanDigits = `55${rawDigits}`
  }
  const waUrl = cleanDigits && cleanDigits.length >= 8
    ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`
    : null

  const storedSettings = typeof window !== 'undefined' ? getStoredPitchSettings() : null
  const baseCity = storedSettings?.senderCity || ''
  const isLocal = lead ? isLeadInSameCity(lead.address, baseCity) : false
  const instagramUrl = lead?.instagram || (lead?.website && /instagram\.com/i.test(lead.website) ? lead.website : (lead?.presence === 'social' && lead.website ? lead.website : null))
  const hasInstagram = Boolean(instagramUrl)
  const googleSearchUrl = lead ? `https://www.google.com/search?q=${encodeURIComponent(`${lead.name} ${lead.address} contato telefone whatsapp instagram`)}` : ''
  const specialty = lead ? extractSpecialtyInfo(lead, effectiveQuery) : null
  const hasKey = Boolean(storedSettings?.geminiApiKey?.trim() || serverHasKey)

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
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold capitalize text-primary">
                    {specialty?.specialtyLabel || lead.category}
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
                  title="Configurar remetente e IA Gemini"
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
                  <span className="text-[11px] font-medium text-muted-foreground">Telefone / Contato</span>
                  <p className="mt-0.5 truncate font-mono text-xs font-semibold text-primary">
                    {lead.phone || (
                      lead.email ? (
                        <span className="font-sans text-emerald-400">{lead.email}</span>
                      ) : lead.website ? (
                        <span className="font-sans text-sky-400">Via Site Oficial</span>
                      ) : (
                        <span className="font-sans italic text-muted-foreground">Sem tel no Maps</span>
                      )
                    )}
                  </p>
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
                        Abordagem Adaptada para {specialty?.specialtyLabel || lead.category}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Texto 100% humanizado com o nome e o ramo pesquisado deste estabelecimento
                      </p>
                    </div>
                  </div>

                  {/* Badges de contexto ativo e status da IA */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {loadingAi ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse">
                        <Loader2 className="size-3 animate-spin text-amber-400" />
                        Gemini gerando em tempo real...
                      </span>
                    ) : isAiGenerated ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <Sparkles className="size-2.5 text-emerald-400" /> Gemini IA Tempo Real
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        ⚡ Motor Nativo por Nicho
                      </span>
                    )}

                    {!hasKey && (
                      <button
                        type="button"
                        onClick={() => setConfigOpen(true)}
                        className="inline-flex items-center gap-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-300 transition hover:bg-yellow-500/20"
                        title="Configurar chave do Google Gemini para respostas em tempo real"
                      >
                        <Key className="size-2.5 text-yellow-400" />
                        Ativar Gemini
                      </button>
                    )}

                    {isAiGenerated && (
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(localFallback)
                          setIsAiGenerated(false)
                        }}
                        title="Ver versão rápida determinística"
                        className="text-[10px] text-muted-foreground transition hover:text-foreground underline decoration-dotted"
                      >
                        Ver versão nativa
                      </button>
                    )}
                  </div>
                </div>

                {/* Seletores de Persona (Ryan / Rvll / Auto / Dev Web) */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      Apresentação:
                      {savedPersonaFeedback && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          ✓ Salvo como padrão
                        </span>
                      )}
                    </span>
                    {(
                      [
                        { id: 'ryan' as SenderPersona, label: 'Pessoal (Ryan)' },
                        { id: 'dev' as SenderPersona, label: 'Dev Web' },
                        { id: 'auto' as SenderPersona, label: 'Auto' },
                        { id: 'rvll' as SenderPersona, label: 'Equipe' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePersonaChange(p.id)}
                        title={`Apresentar como ${p.label} (salva como padrão para todos os leads)`}
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
                      title="Gera outra variação de abordagem"
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
                      {showAiInput ? 'Ocultar' : 'IA Custom'}
                    </button>
                  </div>
                </div>

                {/* Seletor Rápido de Idioma da Abordagem */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Globe className="size-3 text-primary" />
                    Idioma:
                  </span>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleLanguageChange(l.code)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        selectedLanguage === l.code
                          ? 'border border-primary bg-primary/20 text-primary font-bold shadow-sm'
                          : 'border border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.code === 'auto' ? 'Auto' : l.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Caixa de input opcional para IA */}
                {showAiInput && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-primary/30 bg-background/80 p-3">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Instrução opcional para o Gemini refinar esta mensagem:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Ex: Foque no agendamento aos sábados ou mencione um procedimento específico"
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
                        {loadingAi ? 'Gerando...' : 'Gerar com Gemini'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Editor / Visualizador da Mensagem */}
                <div className="relative mt-3">
                  <textarea
                    rows={7}
                    value={message}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    aria-label="Texto da mensagem de abordagem"
                    className="w-full resize-y rounded-xl border border-border bg-background p-3.5 font-sans text-xs leading-relaxed text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>💡 Mensagem 100% adaptada ao ramo pesquisado e ao nome do local. Você pode editar qualquer palavra antes de enviar.</span>
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

                  <div className="flex flex-wrap items-center gap-2">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-press inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-xs font-bold text-background shadow-sm transition hover:brightness-110"
                      >
                        <MessageCircle className="size-4" />
                        Chamar no WhatsApp
                      </a>
                    )}

                    {lead.phone && !waUrl && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="btn-press inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/20"
                      >
                        <Phone className="size-4" />
                        Ligar ({lead.phone})
                      </a>
                    )}

                    {lead.website && lead.presence === 'site' && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-press inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/15 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-primary/25"
                      >
                        <Globe className="size-4" />
                        Acessar Site & Contato
                        <ExternalLink className="size-3" />
                      </a>
                    )}

                    {instagramUrl && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-press inline-flex items-center gap-2 rounded-lg border border-pink-500/40 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-3.5 py-2 text-xs font-bold text-pink-400 transition hover:from-purple-600/30 hover:to-pink-600/30"
                      >
                        <InstagramIcon className="size-4" />
                        Enviar DM no Instagram
                        <ExternalLink className="size-3" />
                      </a>
                    )}

                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}?subject=${encodeURIComponent(`Oportunidade e Presença Digital — ${lead.name}`)}&body=${encodeURIComponent(message)}`}
                        className="btn-press inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-primary/20"
                      >
                        <Mail className="size-4" />
                        Enviar por E-mail
                      </a>
                    )}

                    {!waUrl && (
                      <a
                        href={googleSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Pesquisar contatos, telefone e WhatsApp no Google"
                        className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        <Search className="size-3.5" />
                        Buscar Contato no Google
                      </a>
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
            const initialLang = (settings.language && settings.language !== 'auto') ? settings.language : 'auto'
            const nextText = generatePitch(lead, settings, variationIndex, effectiveQuery)
            setMessage(nextText)
            setLocalFallback(nextText)

            const hasK = Boolean(settings.geminiApiKey?.trim() || serverHasKey)
            if (hasK && settings.autoGemini !== false) {
              fetchGeminiPitch(lead, settings, initialLang, selectedPersona, selectedTone, variationIndex, undefined, effectiveQuery)
            }
          }
        }}
      />
    </>
  )
}
