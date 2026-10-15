import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-xl border border-line bg-surface', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/** A label/value row used in cost and pricing breakdowns. */
export function Row({ label, value, strong, tone, indent }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: 'profit' | 'loss'; indent?: boolean }) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-3 py-1 text-sm', strong && 'font-semibold', indent && 'pl-3')}>
      <span className={clsx(!strong && 'text-ink-muted')}>{label}</span>
      <span className={clsx('tabular shrink-0 whitespace-nowrap', tone === 'profit' && 'text-profit', tone === 'loss' && 'text-loss')}>{value}</span>
    </div>
  )
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-[transform,background-color,color] duration-150 ease-out hover-fine:bg-danger/10 hover-fine:text-danger active:scale-[0.97]"
    >
      {children}
    </button>
  )
}

export const TrashIcon = () => (
  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
