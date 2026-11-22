import { useRef, useState, type ReactNode } from 'react'
import { Button } from '../components/Button'
import { NoteBox } from './NoteBox'
import type { NoteSaver } from './useNoteSaver'

/* Notes for a Word or text file (PageRows.tsx). These have no fixed pages, so the file is shown
   whole on the left and the student adds notes pages on the right as they need them. Pages are
   numbered by position. An empty added page can be removed; an empty note isn't stored, so it
   doesn't come back. */

/** Same as MAX_ADDED_PAGES in backend/app/materials/notes.py */
const MAX_PAGES = 50

export function NotesPages({ pages, onPagesChange, saver, children }: {
  /** The note page numbers, in order (page 1 is always there) */
  pages: number[]
  onPagesChange: (pages: number[]) => void
  saver: NoteSaver
  /** The file, shown whole */
  children: ReactNode
}) {
  const fileRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const [added, setAdded] = useState<number>()
  const next = Math.max(...pages) + 1

  function add() {
    onPagesChange([...pages, next])
    setAdded(next) // its box takes focus when it appears
  }

  function remove(index: number) {
    stackRef.current?.querySelectorAll('textarea')[index - 1]?.focus()
    onPagesChange(pages.filter((_, i) => i !== index))
  }

  return (
    <li className="material-view__row">
      <div ref={fileRef} className="material-view__source">{children}</div>
      <div ref={stackRef} className="material-view__stack">
        {pages.map((page, index) => {
          const text = saver.texts[page] ?? ''
          return (
            <NoteBox
              key={page}
              label={`Notes page ${index + 1}`}
              value={text}
              pageRef={fileRef}
              autoFocus={page === added}
              onChange={(value) => saver.change(page, value)}
              onBlur={() => saver.flush(page)}
              onRemove={index > 0 && !text ? () => remove(index) : undefined}
            />
          )
        })}
        {next <= MAX_PAGES && (
          <Button icon="plus" className="material-view__add" onClick={add}>
            Add notes page
          </Button>
        )}
      </div>
    </li>
  )
}
