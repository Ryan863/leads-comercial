'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Globe, Key, Loader2, MapPin, Sparkles, User, X } from 'lucide-react'
import {
  DEFAULT_PITCH_SETTINGS,
  getStoredPitchSettings,
  saveStoredPitchSettings,
  SUPPORTED_LANGUAGES,
  type PitchSettings,
  type PitchTone,
  type SenderPersona,
} from '@/lib/pitch-generator'

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function PitchConfigDialog({ open, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [settings, setSettings] = useState<PitchSettings>(DEFAULT_PITCH_SETTINGS)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [serverHasKey, setServerHasKey] = useState(false)

  useEffect(() => {
    if (open) {
      setSettings(getStoredPitchSettings())
      setTestResult(null)
      dialogRef.current?.showModal()

      fetch('/api/ai-pitch')
        .then((r) => r.json())
        .then((d) => {
          if (d.hasServerKey) setServerHasKey(true)
        })
        .catch(() => {})
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  async function handleTestKey() {
    const keyToTest = settings.geminiApiKey?.trim()
    if (!keyToTest && !serverHasKey) {
      setTestResult({ ok: false, msg: 'Cole sua chave do Gemini antes de testar.' })
      return
    }

    setTestingKey(true)
    setTestResult(null)

    try {
      const sampleLead = {
        name: 'Barbearia Exemplo',
        category: 'Barbearia',
        phone: '49999999999',
        whatsapp: true,
        address: 'Rua das Flores, 100 - Videira - SC',
        presence: 'none' as const,
      }

      const res = await fetch('/api/ai-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: sampleLead,
          settings: { ...settings, geminiApiKey: keyToTest },
        }),
      })

      const data = await res.json()
      if (res.ok && data.isAi) {
        setTestResult({
          ok: true,
          msg: `Chave conectada com sucesso! Respondeu via Gemini (${data.model || 'Flash'}).`,
        })
      } else {
        setTestResult({
          ok: false,
          msg: data.error || 'A API não retornou resposta via IA. Verifique a chave ou o limite do Google.',
        })
      }
    } catch {
      setTestResult({ ok: false, msg: 'Erro de rede ao conectar à API do Gemini.' })
    } finally {
      setTestingKey(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveStoredPitchSettings(settings)
    setSavedFeedback(true)
    setTimeout(() => {
      setSavedFeedback(false)
      onSaved?.()
      onClose()
    }, 600)
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      className="m-auto w-[min(94vw,34rem)] rounded-2xl border border-border bg-popover p-0 text-foreground shadow-2xl backdrop:bg-background/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Automação de Mensagens</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Personalize remetente, nicho e integração com Gemini em tempo real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cfg-name" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <User className="size-3.5 text-primary" />
                Seu Nome
              </label>
              <input
                id="cfg-name"
                type="text"
                value={settings.senderName}
                onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                placeholder="Ex: Ryan"
                className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="cfg-city" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MapPin className="size-3.5 text-primary" />
                Sua Cidade Base
              </label>
              <input
                id="cfg-city"
                type="text"
                value={settings.senderCity}
                onChange={(e) => setSettings({ ...settings, senderCity: e.target.value })}
                placeholder="Ex: Videira"
                className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cfg-role" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Como você se descreve brevemente:
            </label>
            <input
              id="cfg-role"
              type="text"
              value={settings.senderRole}
              onChange={(e) => setSettings({ ...settings, senderRole: e.target.value })}
              placeholder="Ex: desenvolvedor web, crio sites modernos e práticos"
              className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Idioma Padrão da Abordagem */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Globe className="size-3.5 text-primary" />
              Idioma Padrão das Abordagens:
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSettings({ ...settings, language: l.code })}
                  className={`flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition ${
                    (settings.language || 'auto') === l.code
                      ? 'border-primary bg-primary/10 font-bold text-primary shadow-sm'
                      : 'border-border bg-background/40 text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span className="truncate">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Tom Padrão da Abordagem:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'consultative' as PitchTone, title: 'Acolhedor', desc: 'Suave e focado em tirar dúvidas' },
                  { id: 'preview' as PitchTone, title: 'Prévia', desc: 'Oferece modelo visual em 1 minuto' },
                  { id: 'direct' as PitchTone, title: 'Direto', desc: 'Objetivo, rápido e sem rodeios' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, tone: t.id })}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    settings.tone === t.id
                      ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-sm'
                      : 'border-border bg-background/40 text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">{t.title}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Apresentação Padrão (Persona) */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Como quer se apresentar por padrão (Assinatura):
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: 'ryan' as SenderPersona, title: 'Pessoal', desc: 'Usa seu nome ("Meu nome é Ryan...")' },
                  { id: 'dev' as SenderPersona, title: 'Dev Web', desc: 'Desenvolvedor web ("Sou desenvolvedor web...")' },
                  { id: 'auto' as SenderPersona, title: 'Auto', desc: 'Adapta pelo contexto do nicho' },
                  { id: 'rvll' as SenderPersona, title: 'Equipe', desc: 'Apresenta como equipe de desenvolvimento' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, persona: p.id })}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    (settings.persona || 'ryan') === p.id
                      ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-sm'
                      : 'border-border bg-background/40 text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">{p.title}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Instruções Adicionais de Texto (Opcional) */}
          <div>
            <label htmlFor="cfg-instructions" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Preferência de abordagem / Instrução extra (opcional):
            </label>
            <input
              id="cfg-instructions"
              type="text"
              value={settings.customInstructions || ''}
              onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
              placeholder="Ex: Focar em demonstrar vitrine no WhatsApp com prévia rápida"
              className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Seção Gemini API */}
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="cfg-key" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Key className="size-3.5 text-yellow-400" />
                API do Google Gemini (Tempo Real)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Gerar chave gratuita →
              </a>
            </div>

            {serverHasKey && !settings.geminiApiKey && (
              <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                ✨ Chave Gemini detectada nas variáveis de ambiente do sistema! Você já pode usá-la em tempo real.
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <input
                id="cfg-key"
                type="password"
                value={settings.geminiApiKey || ''}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                placeholder="Cole sua chave AIzaSy... (Google AI Studio)"
                className="h-9 flex-1 rounded-lg border border-input bg-card px-3 font-mono text-xs outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testingKey}
                className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-60"
              >
                {testingKey ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {testingKey ? 'Testando...' : 'Testar'}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-2 rounded-lg border p-2 text-xs ${
                  testResult.ok
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-medium'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}
              >
                {testResult.msg}
              </div>
            )}

            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="checkbox"
                id="cfg-autogemini"
                checked={settings.autoGemini !== false}
                onChange={(e) => setSettings({ ...settings, autoGemini: e.target.checked })}
                className="size-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="cfg-autogemini" className="text-xs font-medium text-foreground cursor-pointer">
                Gerar abordagem com Gemini em tempo real automaticamente ao abrir cada lead
              </label>
            </div>

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              💡 <strong>Dica:</strong> Com a chave ativa, cada mensagem é adaptada 100% ao ramo do estabelecimento em tempo real, sem jamais soar como spam, e com fallback nativo instantâneo.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 glow-primary"
            >
              {savedFeedback ? <Check className="size-3.5" /> : null}
              {savedFeedback ? 'Salvo!' : 'Salvar Preferências'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
