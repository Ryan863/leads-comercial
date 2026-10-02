'use client'

import { useState } from 'react'
import { Check, Copy, FileSpreadsheet, FileText } from 'lucide-react'
import type { Lead } from '@/lib/leads'
import { copyPhones, exportCsv, exportExcel } from '@/lib/export'

export function ExportActions({ leads }: { leads: Lead[] }) {
  const [copied, setCopied] = useState(false)
  const disabled = leads.length === 0

  const base =
    'inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40'

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => exportCsv(leads)} className={base}>
        <FileText className="size-4" aria-hidden="true" />
        Exportar CSV
      </button>
      <button type="button" disabled={disabled} onClick={() => exportExcel(leads)} className={base}>
        <FileSpreadsheet className="size-4" aria-hidden="true" />
        Exportar Excel
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          await copyPhones(leads)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
        className={base}
        aria-live="polite"
      >
        {copied ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {copied ? 'Copiado!' : 'Copiar Telefones'}
      </button>
    </div>
  )
}
