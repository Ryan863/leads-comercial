'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Key, MapPin, Sparkles, User, X } from 'lucide-react'
import {
  DEFAULT_PITCH_SETTINGS,
  getStoredPitchSettings,
  saveStoredPitchSettings,
  type PitchSettings,
  type PitchTone,
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

  useEffect(() => {
    if (open) {
      setSettings(getStoredPitchSettings())
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

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
                Personalize quem envia a mensagem e as preferências do gerador
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
                required
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
                required
                className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cfg-role" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Apresentação / Atuação
            </label>
            <input
              id="cfg-role"
              type="text"
              value={settings.senderRole}
              onChange={(e) => setSettings({ ...settings, senderRole: e.target.value })}
              placeholder="Ex: crio sites limpos e práticos"
              className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Aparece no início da mensagem: &quot;Sou o {settings.senderName || 'Ryan'}, moro aqui em {settings.senderCity || 'Videira'} e {settings.senderRole}...&quot;
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Identidade / Assinatura da Mensagem
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'auto' as const, label: 'Automático', desc: 'Alterna Rvll e Ryan conforme porte' },
                { id: 'ryan' as const, label: 'Ryan', desc: 'Abordagem pessoal 1 a 1' },
                { id: 'rvll' as const, label: 'Equipe Rvll', desc: 'Abordagem profissional de equipe' },
                { id: 'dev' as const, label: 'Desenvolvedor', desc: 'Foco técnico especialista' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, persona: p.id })}
                  className={`flex flex-col items-start rounded-lg border p-2 text-left transition ${
                    settings.persona === p.id
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background/50 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <span className="text-xs">{p.label}</span>
                  <span className="text-[10px] opacity-75">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              📍 Regra de Localização Inteligente
            </p>
            <p className="mt-1 leading-relaxed text-[11px]">
              Se o lead for de <strong>{settings.senderCity || 'Videira'}</strong>, a mensagem menciona naturalmente que você mora/é daqui da cidade e cita a rua. Se a busca for em <strong>outra cidade</strong>, o sistema <strong>NÃO fala onde você mora</strong> e foca no nicho do cliente sem constrangimento.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Estilo / Tom Padrão
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'consultative' as PitchTone, label: 'Acolhedor (Saúde)', desc: 'Igual aos exemplos do Ryan' },
                { id: 'preview' as PitchTone, label: 'Oferta de Prévia', desc: 'Foco em mostrar estrutura' },
                { id: 'direct' as PitchTone, label: 'Direto & Sem Site', desc: 'Foco em oportunidade rápida' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, tone: t.id })}
                  className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${
                    settings.tone === t.id
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background/50 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <span className="text-xs">{t.label}</span>
                  <span className="text-[10px] opacity-75">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="cfg-key" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Key className="size-3.5 text-yellow-400" />
                Chave Gratuita Google Gemini (Opcional)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Gerar chave grátis →
              </a>
            </div>
            <input
              id="cfg-key"
              type="password"
              value={settings.geminiApiKey || ''}
              onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              placeholder="Cole sua chave AIzaSy... (opcional)"
              className="mt-2 h-9 w-full rounded-lg border border-input bg-card px-3 font-mono text-xs outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              💡 <strong>Não tem chave?</strong> Sem problemas! O motor nativo já vem programado com 100% dos padrões exatos do Ryan, com hiperlocalidade e adaptação de nicho totalmente gratuita e sem limite.
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
