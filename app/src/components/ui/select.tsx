import { forwardRef, type SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-border-strong bg-panel px-3.5 py-2 text-sm text-foreground outline-none focus:border-olive',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})

export { Select }
