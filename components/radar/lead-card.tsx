'use client'

import { ArrowUpRight, Globe, Mail, MapPin, MessageCircle, MessageSquareText, Star } from 'lucide-react'
import { initials, mapsLink, whatsappLink, emailLink, instagramLink, type Lead } from '@/lib/leads'

function InstagramIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

const PRESENCE = {
  none: { label: 'Sem Site - Alta Prioridade', badge: 'border-hot/50 bg-hot/10 text-hot', avatar: 'from-red-500 to-red-700' },
  social: { label: 'Usa Rede Social', badge: 'border-social/50 bg-social/10 text-social', avatar: 'from-violet-500 to-purple-700' },
  site: { label: 'Tem Site', badge: 'border-primary/50 bg-primary/10 text-primary', avatar: 'from-blue-500 to-blue-700' },
} as const

function WebsiteValue({ lead }: { lead: Lead }) {
  if (!lead.website) return <span className="font-semibold text-hot">Nenhum site (Oportunidade)</span>
  return (
    <a
      href={lead.website}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-semibold text-primary transition hover:underline"
    >
      {lead.presence === 'social' ? 'Ver Instagram' : 'Acessar Domínio'}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </a>
  )
}

function Actions({ lead, onNote, compact = false }: { lead: Lead; onNote: (l: Lead) => void; compact?: boolean }) {
  const hasPhone = Boolean(lead.phone && lead.phone.replace(/\D/g, '').length >= 8)
  const insta = instagramLink(lead)
  const hasEmail = Boolean(lead.email)
  const hasWebsite = Boolean(lead.website && lead.presence === 'site')

  return (
    <div className="flex items-center gap-2">
      {hasPhone ? (
        <a
          href={whatsappLink(lead)}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir WhatsApp com a mensagem personalizada pronta"
          className={`btn-press inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-success text-sm font-semibold text-background shadow-sm transition hover:brightness-110 ${
            compact ? 'px-3' : 'flex-1'
          }`}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          <span className={compact ? 'sr-only sm:not-sr-only' : ''}>Chamar no WhatsApp</span>
        </a>
      ) : hasWebsite ? (
        <a
          href={lead.website!}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir site oficial para enviar proposta pelo formulário ou chat"
          className={`btn-press inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/20 ${
            compact ? 'px-3' : 'flex-1'
          }`}
        >
          <Globe className="size-4" aria-hidden="true" />
          <span className={compact ? 'sr-only sm:not-sr-only' : ''}>Contato no Site</span>
          <ArrowUpRight className="size-3.5 opacity-70" aria-hidden="true" />
        </a>
      ) : insta ? (
        <a
          href={insta}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir perfil no Instagram para mandar mensagem no direct"
          className={`btn-press inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-pink-500/40 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-sm font-semibold text-pink-400 shadow-sm transition hover:from-purple-600/30 hover:to-pink-600/30 ${
            compact ? 'px-3' : 'flex-1'
          }`}
        >
          <InstagramIcon className="size-4" />
          <span className={compact ? 'sr-only sm:not-sr-only' : ''}>Instagram DM</span>
          <ArrowUpRight className="size-3.5 opacity-70" aria-hidden="true" />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onNote(lead)}
          title="Ver mensagem adaptada, dados de contato e buscar no Google"
          className={`btn-press inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 text-xs font-semibold text-primary transition hover:bg-primary/20 ${
            compact ? 'px-3' : 'flex-1'
          }`}
        >
          <MessageSquareText className="size-4" aria-hidden="true" />
          <span className={compact ? 'sr-only sm:not-sr-only' : ''}>Opções de Contato</span>
        </button>
      )}

      {/* Botão de E-mail ou Instagram Secundário */}
      {hasEmail ? (
        <a
          href={emailLink(lead) ?? undefined}
          title={`Enviar proposta por e-mail para ${lead.email}`}
          className="btn-press inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 text-sm font-medium text-primary transition hover:bg-primary/20"
        >
          <Mail className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">E-mail</span>
        </a>
      ) : insta && hasPhone ? (
        <a
          href={insta}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir perfil do Instagram"
          className="btn-press inline-flex h-10 items-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-500/10 px-3 text-sm font-medium text-pink-400 transition hover:bg-pink-500/20"
        >
          <InstagramIcon className="size-4" />
          <span className="hidden sm:inline">Insta</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onNote(lead)}
          title="Copiar mensagem adaptada para enviar por e-mail ou formulário"
          className="btn-press inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Mail className="size-4 opacity-60" aria-hidden="true" />
          <span className="hidden sm:inline">E-mail</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onNote(lead)}
        title="Ver mensagem adaptada, IA e detalhes"
        aria-label={`Ver mensagem adaptada e detalhes de ${lead.name}`}
        className="btn-press inline-flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-primary transition hover:bg-primary/15 hover:text-primary"
      >
        <MessageSquareText className="size-4" aria-hidden="true" />
      </button>
      <a
        href={mapsLink(lead)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir ${lead.name} no Google Maps`}
        title="Ver localização e ficha completa no Google Maps"
        className="btn-press inline-flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <MapPin className="size-4" aria-hidden="true" />
      </a>
    </div>
  )
}

export function LeadCard({ lead, onNote }: { lead: Lead; onNote: (l: Lead) => void }) {
  const p = PRESENCE[lead.presence]
  return (
    <article className="animate-card-enter hover-lift flex flex-col rounded-2xl border border-border bg-card/70 p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <header className="flex items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${p.avatar}`}>
          {initials(lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{lead.name}</h3>
          <p className="text-xs text-muted-foreground">{lead.category}</p>
        </div>
        <span className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline ${p.badge}`}>
          {p.label}
        </span>
      </header>
      <span className={`mt-3 w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium sm:hidden ${p.badge}`}>
        {p.label}
      </span>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Telefone / Contato:</dt>
          <dd className="mt-0.5 font-mono font-medium text-primary">
            {lead.phone || (
              lead.email ? (
                <span className="text-xs font-semibold text-emerald-400">E-mail: {lead.email}</span>
              ) : lead.website ? (
                <span className="text-xs font-normal text-sky-400">Via Site Oficial</span>
              ) : (
                <span className="text-xs font-normal italic text-muted-foreground">Sem telefone no Maps</span>
              )
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Avaliações Google:</dt>
          <dd className="mt-0.5 flex items-center gap-1 font-semibold">
            <Star className="size-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
            {lead.rating != null ? `${lead.rating.toFixed(1)} (${lead.reviews} avaliações)` : 'Sem avaliações'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Horário Atual:</dt>
          <dd className={`mt-0.5 font-semibold ${lead.open ? '' : 'text-muted-foreground'}`}>
            {lead.open ? `Aberto - Fecha às ${lead.closesAt}` : 'Fechado agora'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Website Oficial:</dt>
          <dd className="mt-0.5">
            <WebsiteValue lead={lead} />
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-border pt-4">
        <Actions lead={lead} onNote={onNote} />
      </div>
    </article>
  )
}

export function LeadRow({ lead, onNote }: { lead: Lead; onNote: (l: Lead) => void }) {
  const p = PRESENCE[lead.presence]
  return (
    <article className="animate-card-enter hover-lift flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm transition-all hover:border-primary/40 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${p.avatar}`}>
          {initials(lead.name)}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-foreground">{lead.name}</h3>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            <span className="font-mono text-primary">
              {lead.phone || (lead.email ? `E-mail: ${lead.email}` : lead.website ? 'Via Site Oficial' : 'Opções de Contato')}
            </span>
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              {lead.rating != null ? `${lead.rating.toFixed(1)} (${lead.reviews})` : 'Sem avaliações'}
            </span>
          </p>
        </div>
      </div>
      <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${p.badge}`}>{p.label}</span>
      <Actions lead={lead} onNote={onNote} compact />
    </article>
  )
}
