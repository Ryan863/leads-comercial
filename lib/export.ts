import type { Lead } from './leads'
import { generatePitch } from './pitch-generator'

const PRESENCE_LABEL = { none: 'Sem site', social: 'Rede social', site: 'Site próprio' } as const

const HEADERS = [
  'Nome',
  'Categoria',
  'Telefone',
  'WhatsApp',
  'E-mail',
  'Avaliação',
  'Avaliações',
  'Horários da Semana',
  'Presença',
  'Website',
  'Endereço',
  'Mensagem WhatsApp (Abordagem Pronta)',
]

function toRows(leads: Lead[]) {
  return leads.map((l) => [
    l.name,
    l.category,
    l.phone,
    l.whatsapp ? 'Sim' : 'Não',
    l.email ?? '',
    l.rating != null ? String(l.rating).replace('.', ',') : '',
    l.reviews != null ? String(l.reviews) : '0',
    l.hours_text ?? 'Não informado',
    PRESENCE_LABEL[l.presence],
    l.website ?? '',
    l.address,
    generatePitch(l),
  ])
}

function sanitizeSlug(text: string): string {
  if (!text) return 'geral'
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'geral'
}

export function buildExportFilename(query?: string, ext: 'csv' | 'xls' = 'csv'): string {
  let niche = 'leads'
  let city = 'geral'

  if (query) {
    const parts = query.split(/\sem\s/i)
    if (parts.length > 1) {
      niche = parts[0].trim()
      city = parts[1].trim()
    } else if (query.includes('-')) {
      const sub = query.split('-')
      niche = sub[0].trim()
      city = sub.slice(1).join('-').trim()
    } else {
      niche = query.trim()
    }
  }

  const sNiche = sanitizeSlug(niche)
  const sCity = sanitizeSlug(city)

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  return `leads_${sNiche}_${sCity}_${timestamp}.${ext}`
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob(['\uFEFF' + content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(leads: Lead[], query?: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [HEADERS, ...toRows(leads)].map((r) => r.map(escape).join(';')).join('\n')
  const filename = buildExportFilename(query, 'csv')
  download(csv, filename, 'text/csv;charset=utf-8')
}

export function exportExcel(leads: Lead[], query?: string) {
  const esc = (v: string) =>
    v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
  const head = `<tr>${HEADERS.map((h) => `<th style="background:#2563eb;color:#fff;font-weight:bold;padding:6px;">${h}</th>`).join('')}</tr>`
  const body = toRows(leads)
    .map((r) => `<tr>${r.map((c) => `<td style="vertical-align:top;padding:6px;border:1px solid #ddd;">${esc(c)}</td>`).join('')}</tr>`)
    .join('')
  const html = `<html><head><meta charset="utf-8"></head><body><table border="1" style="font-family:Arial,sans-serif;font-size:12px;border-collapse:collapse;">${head}${body}</table></body></html>`
  const filename = buildExportFilename(query, 'xls')
  download(html, filename, 'application/vnd.ms-excel')
}

export async function copyPhones(leads: Lead[]) {
  await navigator.clipboard.writeText(leads.map((l) => l.phone).join('\n'))
}
