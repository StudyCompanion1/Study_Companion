import type { MasteryLevel } from '../components/MasteryBadge'
import type { Collection, MaterialKind, Note } from './types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** { value: 18, unit: 'slides' } → "18 slides"; singular for 1 ("1 page"). */
export function formatLength(length: Note['length']): string {
  const { value, unit } = length
  if (unit === 'min') return `${value} min`
  const word = value === 1 ? unit.slice(0, -1) : unit
  return `${value} ${word}`
}

/**
 * How long ago something happened, in the app's plain wording:
 * "Just now", "5 min ago", "2 h ago", "Yesterday", "3 days ago", "Last week", "2 weeks ago".
 * `now` is a parameter so tests (and the mock data) don't depend on today's date.
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  if (diff < 60 * 1000) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / 60000)} min ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`
  const days = Math.floor(diff / DAY)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return `${Math.floor(days / 7)} weeks ago`
}

/** Groups collections by term, keeping the order terms first appear in. */
export function groupByTerm(list: Collection[]): { term: string; collections: Collection[] }[] {
  const groups = new Map<string, Collection[]>()
  for (const collection of list) {
    const group = groups.get(collection.term) ?? []
    group.push(collection)
    groups.set(collection.term, group)
  }
  return [...groups].map(([term, collections]) => ({ term, collections }))
}

/** Most recently opened first. Returns a new array; never changes the one passed in. */
export function sortByOpened(list: Note[]): Note[] {
  return [...list].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
}

/** Only the notes that belong to one collection. */
export function notesFor(collectionId: string, list: Note[]): Note[] {
  return list.filter((note) => note.collectionId === collectionId)
}

/** "1 note" / "12 notes", "1 collection" / "4 collections". */
export function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

/** Section summary on the Collections page, e.g. "4 collections · 41 notes". */
export function termSummary(list: Collection[]): string {
  const totalNotes = list.reduce((sum, c) => sum + c.noteCount, 0)
  return `${plural(list.length, 'collection')} · ${plural(totalNotes, 'note')}`
}

/** The words on a MasteryBadge (Figma: strong = Mastered, review = Review soon, low = Needs practice). */
export function masteryLabel(level: MasteryLevel): string {
  return { strong: 'Mastered', review: 'Review soon', low: 'Needs practice' }[level]
}

/** The type word shown with a file: "Slides", "PDF", "Doc", "Audio". */
export function materialLabel(kind: MaterialKind): string {
  return { slides: 'Slides', pdf: 'PDF', doc: 'Doc', audio: 'Audio' }[kind]
}

/** Summary under a collection's title, e.g. "BIO 201 · Autumn 2026 · 12 notes". */
export function collectionSummary(collection: Collection, noteCount: number): string {
  return `${collection.code} · ${collection.term} · ${plural(noteCount, 'note')}`
}
