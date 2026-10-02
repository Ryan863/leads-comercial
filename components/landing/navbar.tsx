import Link from 'next/link'
import { Logo } from '@/components/logo'

const links = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#depoimentos', label: 'Vantagens Beta' },
  { href: '#planos', label: 'Condições' },
]

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6" aria-label="Principal">
        <Logo />
        <ul className="hidden items-center gap-1 rounded-full border border-border bg-card/60 p-1 text-sm md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="hidden px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Abrir Radar
          </Link>
          <Link
            href="/app"
            className="btn-press hover-lift rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 glow-primary"
          >
            Testar no Beta
          </Link>
        </div>
      </nav>
    </header>
  )
}
