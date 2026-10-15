import clsx from 'clsx'
import type { InputHTMLAttributes } from 'react'

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      {...props}
      className={clsx(
        'h-9 w-full min-w-0 rounded-md border border-line bg-surface px-2.5 text-sm outline-none transition-colors duration-150 placeholder:text-ink-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
    />
  )
}

export function Select({ className, children, ...props }: InputHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      className={clsx(
        'h-9 w-full min-w-0 rounded-md border border-line bg-surface px-2 text-sm outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
    >
      {children}
    </select>
  )
}
