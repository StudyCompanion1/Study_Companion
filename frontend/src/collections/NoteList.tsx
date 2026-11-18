import type { LiHTMLAttributes, ReactNode } from 'react'
import { List } from '../components/List'
import { MasteryBadge } from '../components/MasteryBadge'
import { FileChip } from './FileChip'
import { formatLength, formatRelative, masteryLabel } from './helpers'
import type { Note } from './types'
import './NoteList.css'

/* The notes inside one collection. Figma: Library and Wireframes → NoteRow + NoteRow header.
   - Wide list: five columns (note, material, length, opened, mastery) under a header row.
   - Narrow list (< 820px of its own width, e.g. phones or very large text): each row stacks into
     title / "Slides · 18 slides · 2 h ago · + Audio" / mastery, and the header hides.
   The switch is a container query on the shared List, so it follows the list's width, not the screen.
   A note with an href is a link into the material view; the title is the link, and it stretches
   over the whole row (Figma: "the whole row is the link into the note view"). */

export function NoteList({
  notes,
  now,
  controlsFor,
  rowPropsFor,
}: {
  notes: Note[]
  now?: Date
  /** Extra buttons at the end of each row (reordering). */
  controlsFor?: (note: Note, index: number) => ReactNode
  /** Extra attributes for each row's <li> (drag and drop). */
  rowPropsFor?: (note: Note, index: number) => LiHTMLAttributes<HTMLLIElement>
}) {
  return (
    <List>
      {/* Column labels are visual only; each row reads fine on its own for screen readers. */}
      <div className="note-list__header" aria-hidden="true">
        <span className="note-row__title">Note</span>
        <span className="note-row__material">Material</span>
        <span className="note-row__length">Length</span>
        <span className="note-row__opened">Opened</span>
        <span className="note-row__mastery">Mastery</span>
        {controlsFor && <span className="note-row__controls">Order</span>}
      </div>
      <ul className="note-list">
        {notes.map((note, index) => (
          <NoteRow
            key={note.id}
            note={note}
            now={now}
            controls={controlsFor?.(note, index)}
            rowProps={rowPropsFor?.(note, index)}
          />
        ))}
      </ul>
    </List>
  )
}

export function NoteRow({
  note,
  now,
  controls,
  rowProps,
}: {
  note: Note
  now?: Date
  controls?: ReactNode
  rowProps?: LiHTMLAttributes<HTMLLIElement>
}) {
  const { title, material, length, openedAt, mastery, href } = note

  return (
    <li {...rowProps} className={['note-row', rowProps?.className].filter(Boolean).join(' ')}>
      <span className="note-row__title">
        {href ? (
          <a className="note-row__link" href={href} draggable={false}>
            {title}
          </a>
        ) : (
          title
        )}
      </span>
      <span className="note-row__material">
        <FileChip kind={material.kind} fileName={material.fileName} />
        {material.hasAudio && <span className="note-row__audio">+ Audio</span>}
      </span>
      <span className="note-row__length">
        {length ? (
          formatLength(length)
        ) : (
          <>
            <span aria-hidden="true">—</span>
            <span className="note-row__sr">No page count</span>
          </>
        )}
      </span>
      <span className="note-row__opened">
        {openedAt ? (
          <>
            <span className="note-row__sr">Opened </span>
            {formatRelative(openedAt, now)}
          </>
        ) : (
          'Not opened yet'
        )}
      </span>
      <span className="note-row__mastery">
        {mastery ? (
          <MasteryBadge level={mastery} label={masteryLabel(mastery)} />
        ) : (
          <span className="note-row__no-quiz">No quiz yet</span>
        )}
      </span>
      {controls && <span className="note-row__controls">{controls}</span>}
    </li>
  )
}
