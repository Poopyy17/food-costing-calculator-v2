import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium select-none transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  {
    variants: {
      intent: {
        primary: 'bg-accent text-white hover-fine:bg-accent-strong',
        secondary: 'border border-line bg-surface text-ink hover-fine:bg-canvas',
        ghost: 'text-ink-muted hover-fine:bg-canvas hover-fine:text-ink',
        danger: 'text-danger hover-fine:bg-danger/10',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
      },
    },
    defaultVariants: { intent: 'primary', size: 'md' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>

export function Button({ intent, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={button({ intent, size, className })} {...props} />
}
