import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { SectionHeader } from '../components/SectionHeader'
import { plural, searchNotes, sortByOpened } from './helpers'
import { NoteList } from './NoteList'
import type { Note } from './types'
import './NotesSection.css'

/* The "Notes" section of one collection (CollectionPage.tsx): a search box and the list of notes.
   With onMove, the student can put the notes in their own order: drag a row by its grip, or use
   the up and down buttons (keyboard and screen readers). Without it (the Figma preview), notes
   are shown most recently opened first. Reordering pauses while searching, since moving within
   a filtered list would be confusing. */

export function NotesSection({
  notes,
  now,
  onMove,
  orderError,
}: {
  notes: Note[]
  now?: Date
  /** Move a note to a new index in the full list. */
  onMove?: (id: string, toIndex: number) => void
  /** Shown when the new order couldn't be saved. */
  orderError?: string
}) {
  const [query, setQuery] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const moveButtons = useRef(new Map<string, HTMLButtonElement>())
  const refocus = useRef<string | null>(null)

  const ordered = onMove ? notes : sortByOpened(notes)
  const shown = searchNotes(ordered, query)
  const searching = query.trim() !== ''
  const canReorder = Boolean(onMove) && !searching && notes.length > 1

  // Keep keyboard focus on the button that was pressed, even though its row moved
  useEffect(() => {
    if (!refocus.current) return
    const [id, direction] = refocus.current.split(':')
    const other = direction === 'up' ? 'down' : 'up'
    const button = moveButtons.current.get(`${id}:${direction}`)
    const fallback = moveButtons.current.get(`${id}:${other}`)
    ;(button && !button.disabled ? button : fallback)?.focus()
    refocus.current = null
  }, [notes])

  function move(note: Note, from: number, to: number, direction?: 'up' | 'down') {
    if (!onMove || to < 0 || to >= notes.length || to === from) return
    if (direction) refocus.current = `${note.id}:${direction}`
    onMove(note.id, to)
    setAnnouncement(`${note.title} moved to position ${to + 1} of ${notes.length}.`)
  }

  function dropOn(index: number, event: DragEvent) {
    event.preventDefault()
    const from = notes.findIndex((note) => note.id === dragging)
    if (from !== -1) move(notes[from], from, index)
    setDragging(null)
    setDropIndex(null)
  }

  const meta = onMove ? `${plural(notes.length, 'note')} · your order` : `${plural(notes.length, 'note')} · most recently opened first`

  return (
    <section className="collections__section">
      <SectionHeader title="Notes" meta={meta} />

      {notes.length > 0 && (
        <div className="notes-section__tools">
          <label className="notes-section__search">
            <span className="notes-section__search-label">Search this collection</span>
            <span className="notes-section__search-box">
              <Icon name="search" size={20} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Note or file name"
              />
            </span>
          </label>
          {canReorder && <p className="notes-section__hint">Drag a row by its handle, or use the arrows, to reorder.</p>}
        </div>
      )}

      {/* Spoken, not shown: search results and where a moved note ended up */}
      <p className="note-row__sr" role="status">
        {searching ? `${shown.length} of ${plural(notes.length, 'note')} match.` : announcement}
      </p>

      {orderError && <Notice tone="error">{orderError}</Notice>}

      {notes.length === 0 ? (
        <p className="collections__empty">No notes yet. Upload slides, a PDF or a document to start.</p>
      ) : shown.length === 0 ? (
        <p className="collections__empty">No notes match “{query.trim()}”.</p>
      ) : (
        <NoteList
          notes={shown}
          now={now}
          controlsFor={
            canReorder
              ? (note, index) => (
                  <>
                    <span
                      className="note-row__grip"
                      draggable
                      title="Drag to reorder"
                      aria-hidden="true"
                      onDragStart={(event) => {
                        setDragging(note.id)
                        event.dataTransfer?.setData('text/plain', note.id) // Firefox won't drag without data
                        const row = event.currentTarget.closest('li')
                        if (row) event.dataTransfer?.setDragImage(row, 24, 24)
                      }}
                      onDragEnd={() => {
                        setDragging(null)
                        setDropIndex(null)
                      }}
                    >
                      <Icon name="grip" size={20} />
                    </span>
                    {(['up', 'down'] as const).map((direction) => (
                      <button
                        key={direction}
                        type="button"
                        className="note-row__move"
                        aria-label={`Move ${note.title} ${direction}`}
                        disabled={direction === 'up' ? index === 0 : index === notes.length - 1}
                        ref={(button) => {
                          const key = `${note.id}:${direction}`
                          if (button) moveButtons.current.set(key, button)
                          else moveButtons.current.delete(key)
                        }}
                        onClick={() => move(note, index, direction === 'up' ? index - 1 : index + 1, direction)}
                      >
                        <Icon name={direction === 'up' ? 'arrowUp' : 'arrowDown'} size={18} />
                      </button>
                    ))}
                  </>
                )
              : undefined
          }
          rowPropsFor={
            canReorder
              ? (note, index) => ({
                  className: [dragging === note.id && 'is-dragging', dropIndex === index && dragging !== note.id && 'is-drop-target']
                    .filter(Boolean)
                    .join(' '),
                  onDragOver: (event) => {
                    if (!dragging) return
                    event.preventDefault() // allows dropping here
                    setDropIndex(index)
                  },
                  onDrop: (event) => dropOn(index, event),
                })
              : undefined
          }
        />
      )}
    </section>
  )
}
