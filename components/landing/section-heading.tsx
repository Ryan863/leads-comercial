export function SectionHeading({ badge, title, description }: { badge: string; title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium">{badge}</span>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}
