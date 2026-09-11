import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Printer, X } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

import { PrintDocument } from '@/components/print/print-document'

type PrintPreviewProps = {
  /** Heading of the printed document (letterhead + toolbar). */
  docTitle: string
  /** English translation of the title, shown under it in the letterhead. */
  docTitleEn?: string
  /** Filename the browser suggests when printing to PDF. */
  documentTitle?: string
  /** Right-side letterhead meta (date, number, name…). */
  meta?: ReactNode
  onClose: () => void
  children: ReactNode
}

/**
 * A full-screen, print-accurate preview of a branded document. Shows the A4 sheet
 * on a dark backdrop and prints that exact node via react-to-print. Reads nothing
 * and writes nothing — it only presents voucher-derived data passed as children.
 */
export function PrintPreview({ docTitle, docTitleEn, documentTitle, meta, onClose, children }: PrintPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef, documentTitle: documentTitle ?? docTitle })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-[rgba(15,23,42,0.6)] backdrop-blur-sm">
      <div className="flex flex-none items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm font-semibold text-white">معاينة الطباعة — {docTitle}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePrint()}
            className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2 text-[13px] font-semibold text-white shadow-sm"
          >
            <Printer className="size-4" />
            طباعة
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium text-white"
          >
            <X className="size-4" />
            إغلاق
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-10">
        <div className="mx-auto w-fit">
          <PrintDocument ref={contentRef} docTitle={docTitle} docTitleEn={docTitleEn} meta={meta}>
            {children}
          </PrintDocument>
        </div>
      </div>
    </div>,
    document.body,
  )
}
