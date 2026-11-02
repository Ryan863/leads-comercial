import type { Lead } from './leads'

export type OutreachLog = {
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  meta?: Record<string, any>
}

export type OutreachStats = {
  total_leads: number
  pending_count: number
  failed_count: number
  sent_total: number
  sent_today: number
  no_website_count: number
  is_running: boolean
  daily_limit: number
  min_delay_seconds: number
  max_delay_seconds: number
  telegram_configured: boolean
}

export type OutreachConfig = {
  min_delay_seconds: number
  max_delay_seconds: number
  daily_limit: number
  telegram_configured?: boolean
  telegram_bot_token?: string
  telegram_chat_id?: string
}

export type OutreachStatusResponse = {
  is_running: boolean
  stop_requested: boolean
  started_at: string | null
  keep_awake_active: boolean
  countdown_seconds: number | null
  batch_sent_count: number
  current_lead: {
    id: number
    phone: string
    company_name: string
    city: string
    niche: string
    has_website: boolean
    status: string
  } | null
  stats: OutreachStats
  config: OutreachConfig
  logs: OutreachLog[]
}

export async function fetchOutreachStatus(): Promise<OutreachStatusResponse> {
  const res = await fetch('/api/backend/outreach/status', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error('Falha ao obter status da fila de disparo')
  }
  return res.json()
}

export async function syncLeadsToOutreach(leads: Lead[]): Promise<{
  success: boolean
  synced: number
  duplicates_ignored: number
  total_pending: number
  total_leads: number
}> {
  const res = await fetch('/api/backend/outreach/sync-leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao sincronizar leads para a fila')
  }
  return res.json()
}

export async function startOutreach(): Promise<{ status: string; message: string }> {
  const res = await fetch('/api/backend/outreach/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao iniciar fila de disparo')
  }
  return res.json()
}

export async function stopOutreach(): Promise<{ status: string; message: string }> {
  const res = await fetch('/api/backend/outreach/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao pausar fila de disparo')
  }
  return res.json()
}

export async function updateOutreachConfig(
  config: Partial<OutreachConfig>,
): Promise<{ success: boolean; config: OutreachConfig }> {
  const res = await fetch('/api/backend/outreach/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao atualizar configurações')
  }
  return res.json()
}

export async function resetFailedOutreachLeads(): Promise<{ success: boolean; reset_count: number }> {
  const res = await fetch('/api/backend/outreach/reset-failed', {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error('Falha ao resetar leads com falha')
  }
  return res.json()
}

export async function clearOutreachQueue(onlyPending = true): Promise<{ success: boolean; deleted_count: number }> {
  const res = await fetch(`/api/backend/outreach/clear?only_pending=${onlyPending}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao limpar fila')
  }
  return res.json()
}

export type WhatsAppStatus = {
  connected: boolean
  is_connecting?: boolean
  qr_code?: string | null
  status?: string
  message?: string
}

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  const res = await fetch('/api/backend/outreach/whatsapp/status', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error('Falha ao obter status do WhatsApp')
  }
  return res.json()
}

export async function connectWhatsApp(): Promise<{ success: boolean; status: string; message: string }> {
  const res = await fetch('/api/backend/outreach/whatsapp/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao conectar WhatsApp')
  }
  return res.json()
}

export async function disconnectWhatsApp(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/backend/outreach/whatsapp/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao desconectar WhatsApp')
  }
  return res.json()
}


