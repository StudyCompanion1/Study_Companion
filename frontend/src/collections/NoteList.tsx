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
   The switch is a container query on the shared List, so it follows the list's width, not the screen. */

export function NoteList({ notes, now }: { notes: Note[]; now?: Date }) {
  return (
    <List>
      {/* Column labels are visual only; each row reads fine on its own for screen readers. */}
      <div className="note-list__header" aria-hidden="true">
        <span className="note-row__title">Note</span>
        <span className="note-row__material">Material</span>
        <span className="note-row__length">Length</span>
        <span className="note-row__opened">Opened</span>
        <span className="note-row__mastery">Mastery</span>
      </div>
      <ul className="note-list">
        {notes.map((note) => (
          <NoteRow key={note.id} note={note} now={now} />
        ))}
      </ul>
    </List>
  )
}

export function NoteRow({ note, now }: { note: Note; now?: Date }) {
  const { title, material, length, openedAt, mastery } = note

  /* Not a link yet: the Note view isn't built. When it is, wrap the row's content in one <a>
     (Figma: "the whole row is the link into the note view"). */
  return (
    <li className="note-row">
      <span className="note-row__title">{title}</span>
      <span className="note-row__material">
        <FileChip kind={material.kind} fileName={material.fileName} />
        {material.hasAudio && <span className="note-row__audio">+ Audio</span>}
      </span>
      <span className="note-row__length">{formatLength(length)}</span>
      <span className="note-row__opened">
        <span className="note-row__sr">Opened </span>
        {formatRelative(openedAt, now)}
      </span>
      <span className="note-row__mastery">
        {mastery ? (
          <MasteryBadge level={mastery} label={masteryLabel(mastery)} />
        ) : (
          <span className="note-row__no-quiz">No quiz yet</span>
        )}
      </span>
    </li>
  )
}
