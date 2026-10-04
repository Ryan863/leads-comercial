'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import type { Lead } from '@/lib/leads'

function pitch(lead: Lead) {
  const ratingText = lead.rating != null ? ` (${lead.rating.toFixed(1)}⭐)` : ''
  if (lead.presence === 'none')
    return `Olá! Vi que a ${lead.name} tem presença no Google${ratingText}, mas ainda não possui um site próprio. Posso te mostrar como um site profissional pode trazer mais clientes?`
  if (lead.presence === 'social')
    return `Olá! Acompanhei o perfil da ${lead.name} nas redes sociais. Que tal ter um site próprio para converter seus seguidores em clientes? Posso te enviar uma proposta rápida?`
  return `Olá! Analisei o site da ${lead.name} e identifiquei oportunidades para aumentar suas vendas online. Posso compartilhar um diagnóstico gratuito?`
}

export function LeadDetailDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (lead && !dialog.open) dialog.showModal()
    if (!lead && dialog.open) dialog.close()
  }, [lead])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,32rem)] rounded-2xl border border-border bg-popover p-0 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-sm"
    >
      {lead && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{lead.name}</h2>
              <p className="text-sm text-muted-foreground">{lead.address}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-background/60 p-3">
              <dt className="text-xs text-muted-foreground">Telefone</dt>
              <dd className="font-mono">{lead.phone}</dd>
            </div>
            <div className="rounded-lg bg-background/60 p-3">
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="truncate">{lead.email ?? 'Não encontrado'}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <p className="text-sm font-medium">Mensagem de abordagem sugerida</p>
            <p className="mt-2 rounded-lg border border-border bg-background/60 p-3 text-sm leading-relaxed text-muted-foreground">{pitch(lead)}</p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(pitch(lead))
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? 'Copiada!' : 'Copiar mensagem'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
