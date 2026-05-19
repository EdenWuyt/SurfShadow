import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[color:var(--accent)] px-3.5 py-2 text-[color:var(--accent-foreground)] shadow-lg shadow-[color:var(--accent-shadow)] hover:bg-[color:var(--accent-strong)]',
        secondary:
          'bg-[color:var(--surface-2)] px-3.5 py-2 text-[color:var(--foreground)] hover:bg-[color:var(--surface-3)]',
        outline:
          'border border-[color:var(--border)] bg-[color:var(--surface)] px-3.5 py-2 text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]',
        ghost: 'px-3 py-2 text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]',
        destructive: 'bg-[color:var(--danger)] px-3.5 py-2 text-white hover:bg-[color:var(--danger-strong)]',
      },
      size: {
        default: 'h-10',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-11 px-4 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { buttonVariants }
