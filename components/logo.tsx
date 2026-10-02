import Link from 'next/link'
import { Radar } from 'lucide-react'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-primary">
        <Radar className="size-4" aria-hidden="true" />
      </span>
      LeadRadar
    </Link>
  )
}
