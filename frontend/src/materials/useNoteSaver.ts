import { useCallback, useEffect, useRef, useState } from 'react'
import { saveNote } from './viewerApi'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type NoteSaver = ReturnType<typeof useNoteSaver>

/* Saves the notes in the material view as the student types (MaterialView.tsx).
   - Each page's note is saved `delay` ms after typing stops, or straight away when the box loses focus.
   - Saves go out one at a time, in order, so an older save can never land after a newer one.
   - A failed save keeps the text and is retried by "Try again" or by typing on that page again.
   - Leaving the page sends anything unsaved, and the browser asks first if a save is still running. */

export function useNoteSaver(materialId: string, initial: Record<number, string>, delay = 800) {
  const [texts, setTexts] = useState(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [failedPage, setFailedPage] = useState<number | null>(null)
  const unsaved = useRef(new Map<number, string>())
  const failed = useRef(new Set<number>())
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const queue = useRef(Promise.resolve())
  const running = useRef(0)

  const refresh = useCallback(() => {
    const busy = running.current > 0 || unsaved.current.size > failed.current.size
    setFailedPage(failed.current.size ? Math.min(...failed.current) : null)
    setStatus(failed.current.size ? 'error' : busy ? 'saving' : 'saved')
  }, [])

  const flush = useCallback(
    (page: number) => {
      clearTimeout(timers.current.get(page))
      timers.current.delete(page)
      const text = unsaved.current.get(page)
      if (text === undefined) return
      unsaved.current.delete(page)
      failed.current.delete(page)
      running.current += 1
      refresh()
      queue.current = queue.current
        .then(async () => {
          await saveNote(materialId, page, text)
        })
        .catch(() => {
          // Keep the text to retry, unless the student has typed something newer since
          if (!unsaved.current.has(page)) unsaved.current.set(page, text)
          failed.current.add(page)
        })
        .finally(() => {
          running.current -= 1
          refresh()
        })
    },
    [materialId, refresh],
  )

  const change = useCallback(
    (page: number, text: string) => {
      setTexts((current) => ({ ...current, [page]: text }))
      unsaved.current.set(page, text)
      failed.current.delete(page)
      clearTimeout(timers.current.get(page))
      timers.current.set(page, setTimeout(() => flush(page), delay))
      refresh()
    },
    [delay, flush, refresh],
  )

  const retry = useCallback(() => [...failed.current].forEach(flush), [flush])

  useEffect(() => {
    const pageTimers = timers.current
    function beforeUnload(event: BeforeUnloadEvent) {
      // Send unsaved notes right now (not after earlier saves), since the page is going away
      for (const [page, text] of unsaved.current) void saveNote(materialId, page, text).catch(() => {})
      if (running.current > 0 || unsaved.current.size > 0) event.preventDefault() // "Leave site? Changes may not be saved."
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      pageTimers.forEach(clearTimeout)
    }
  }, [materialId])

  return { texts, status, failedPage, change, flush, retry }
}
