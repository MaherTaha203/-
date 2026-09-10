import { type ReactNode } from 'react'

type RouteHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}

export function RouteHeader({ eyebrow, title, description, actions }: RouteHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h1 className="editorial text-[clamp(1.35rem,2.2vw,1.65rem)] text-foreground">{title}</h1>
          <span className="text-[11.5px] font-bold tracking-wide text-olive">{eyebrow}</span>
        </div>
        {description ? (
          <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
