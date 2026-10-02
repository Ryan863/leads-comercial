import type { Lead } from './leads'

const PRESENCE_LABEL = { none: 'Sem site', social: 'Rede social', site: 'Site próprio' } as const

const HEADERS = ['Nome', 'Categoria', 'Telefone', 'WhatsApp', 'E-mail', 'Avaliação', 'Avaliações', 'Presença', 'Website', 'Endereço']

function toRows(leads: Lead[]) {
  return leads.map((l) => [
    l.name,
    l.category,
    l.phone,
    l.whatsapp ? 'Sim' : 'Não',
    l.email ?? '',
    String(l.rating).replace('.', ','),
    String(l.reviews),
    PRESENCE_LABEL[l.presence],
    l.website ?? '',
    l.address,
  ])
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

export function exportCsv(leads: Lead[]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [HEADERS, ...toRows(leads)].map((r) => r.map(escape).join(';')).join('\n')
  download(csv, 'leads-radar.csv', 'text/csv;charset=utf-8')
}

export function exportExcel(leads: Lead[]) {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const head = `<tr>${HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr>`
  const body = toRows(leads)
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')
  const html = `<html><head><meta charset="utf-8"></head><body><table>${head}${body}</table></body></html>`
  download(html, 'leads-radar.xls', 'application/vnd.ms-excel')
}

export async function copyPhones(leads: Lead[]) {
  await navigator.clipboard.writeText(leads.map((l) => l.phone).join('\n'))
}
