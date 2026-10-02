import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showBadge?: boolean
}

export function Logo({ className = '', size = 'md', showBadge = false }: LogoProps) {
  const heightClasses = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
  }[size]

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
      aria-label="Sondar — Radar de Leads B2B"
    >
      <div className="relative flex items-center">
        <Image
          src="/sondar-logo.png"
          alt="Sondar — Radar de Leads B2B"
          width={280}
          height={76}
          className={`${heightClasses} w-auto object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.25)] transition duration-300 group-hover:drop-shadow-[0_0_22px_rgba(56,189,248,0.45)]`}
          priority
        />
      </div>

      {showBadge && (
        <span className="hidden rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-400 sm:inline-block">
          B2B Radar
        </span>
      )}
    </Link>
  )
}
