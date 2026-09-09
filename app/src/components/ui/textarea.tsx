import { forwardRef, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-24 w-full rounded-xl border border-border-strong bg-panel px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-faint focus:border-olive',
        className,
      )}
      {...props}
    />
  )
})

export { Textarea }
