import clsx from 'clsx'
import { useState } from 'react'

type Props = {
  value: number | null
  onChange: (value: number | null) => void
  /** 100 shows a stored fraction (0.12) as a percentage (12). */
  scale?: number
  prefix?: string
  suffix?: string
  min?: number
  className?: string
  'aria-label'?: string
  placeholder?: string
  autoFocus?: boolean
}

const toText = (v: number | null, scale: number) => (v == null ? '' : String(Number((v * scale).toFixed(6))))

/** Keeps the typed text (like "0.") while committing a parsed number on every change. */
export function NumberInput({ value, onChange, scale = 1, prefix, suffix, min = 0, className, placeholder, ...rest }: Props) {
  // While editing, show exactly what was typed; otherwise show the stored value.
  const [draft, setDraft] = useState<string | null>(null)
  const parsed = draft == null || draft === '' ? null : Number(draft)
  // Below-minimum or unparseable input is shown in red and never saved; blur restores the saved value.
  const invalid = parsed != null && (!Number.isFinite(parsed) || parsed < min)

  return (
    <div
      className={clsx(
        'flex h-9 items-center rounded-md border bg-surface px-2.5 text-sm transition-colors duration-150 focus-within:ring-2',
        invalid ? 'border-danger focus-within:ring-danger/20' : 'border-line focus-within:border-accent focus-within:ring-accent/20',
        className,
      )}
    >
      {prefix && <span className="mr-1 text-ink-muted">{prefix}</span>}
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step="any"
        value={draft ?? toText(value, scale)}
        placeholder={placeholder}
        aria-label={rest['aria-label']}
        aria-invalid={invalid || undefined}
        autoFocus={rest.autoFocus}
        onFocus={() => setDraft(toText(value, scale))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = e.target.value === '' ? null : Number(e.target.value)
          if (n === null) onChange(null)
          else if (Number.isFinite(n) && n >= min) onChange(n / scale)
        }}
        className="w-full min-w-0 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && <span className="ml-1 text-ink-muted">{suffix}</span>}
    </div>
  )
}
