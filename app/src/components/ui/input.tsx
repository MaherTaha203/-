import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-border-strong bg-panel px-3.5 py-2 text-sm text-foreground outline-none placeholder:text-faint focus:border-olive',
        className,
      )}
      {...props}
    />
  )
})

export { Input }
