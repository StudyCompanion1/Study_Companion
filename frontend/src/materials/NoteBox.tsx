import { useEffect, useId, useLayoutEffect, useRef, type RefObject } from 'react'
import { Button } from '../components/Button'

/* One notes box in the material view (PageRows.tsx, NotesPages.tsx). It starts small and grows
   as the student types, up to the height of the page it sits beside; longer notes scroll inside
   the box. */

export function NoteBox({ label, value, onChange, onBlur, pageRef, autoFocus, onRemove }: {
  label: string
  value: string
  onChange: (text: string) => void
  onBlur: () => void
  /** The page this box sits beside; the box grows no taller than it. */
  pageRef: RefObject<HTMLElement | null>
  autoFocus?: boolean
  /** Shows a Remove button (for an empty notes page the student added). */
  onRemove?: () => void
}) {
  const id = useId()
  const boxRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => fitToPage(boxRef.current, pageRef.current), [value, pageRef])
  useEffect(() => {
    // the page changes height when its picture loads or the window is resized
    const page = pageRef.current
    if (!page || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => fitToPage(boxRef.current, page))
    observer.observe(page)
    return () => observer.disconnect()
  }, [pageRef])

  return (
    <div className="material-view__notes">
      <div className="material-view__notes-head">
        <label htmlFor={id} className="material-view__notes-label">{label}</label>
        {onRemove && (
          <Button variant="quiet" size="sm" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()}`}>
            Remove
          </Button>
        )}
      </div>
      <textarea
        ref={boxRef}
        id={id}
        className="material-view__textarea"
        value={value}
        maxLength={20000}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </div>
  )
}

/** Short pages (a slide with little text, a file with no preview) still get room to write. */
const MIN_LIMIT_REM = 16

/** Sizes a notes box to its text, at most as tall as its page (label included). */
function fitToPage(box: HTMLTextAreaElement | null, page: HTMLElement | null) {
  if (!box) return
  box.style.height = 'auto'
  const needed = box.scrollHeight + box.offsetHeight - box.clientHeight // text, padding and border
  if (!needed) return // not laid out yet
  const label = (box.parentElement?.offsetHeight ?? 0) - box.offsetHeight
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const limit = Math.max((page?.offsetHeight ?? 0) - label, MIN_LIMIT_REM * rem)
  box.style.height = `${Math.min(needed, limit)}px`
  box.style.overflowY = needed > limit ? 'auto' : 'hidden'
}
