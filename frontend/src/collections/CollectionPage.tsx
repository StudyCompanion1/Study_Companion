import { NavRail } from '../components/NavRail'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import type { Material } from '../materials/api'
import { Breadcrumbs } from './Breadcrumbs'
import { CollectionHead } from './CollectionHead'
import { NotesSection } from './NotesSection'
import type { Collection, LoadStatus, Note } from './types'
import './CollectionsPage.css'
import './CollectionPage.css'

/* Screen 2 — inside one collection. Figma: Screens Desktop → "Collection / Desktop".
   Same page shell as screen 1 (CollectionsPage.css). `collection` is undefined when the address
   names a collection that doesn't exist (or isn't yours), and the page says so.
   Each uploaded file is one row of Notes (CollectionsRoute.tsx turns them into notes); a row
   opens the file and its notes side by side (materials/MaterialView.tsx). */

type NoteProps = {
  /** F1: called with each file uploaded with this page's "Upload material" button. */
  onUploaded?: (material: Material) => void
  /** Lets the student reorder the notes (NotesSection.tsx). */
  onMoveNote?: (id: string, toIndex: number) => void
  orderError?: string
}
type ContentProps = { collection: Collection; notes: Note[]; now?: Date } & NoteProps

export function CollectionPage({
  collection,
  notes,
  now,
  status = 'ready',
  ...noteProps
}: {
  collection: Collection | undefined
  notes: Note[]
  now?: Date
  status?: LoadStatus
} & NoteProps) {
  return (
    <div className="collections">
      <NavRail active="Collections" />
      <main className="collections__main">
        <div className="collections__page">
          {/* Temporary, like on Home: handy for checking all three themes. */}
          <div className="collections__theme-row">
            <ThemeSwitcher />
          </div>

          {status === 'loading' ? (
            <p className="collections__empty" role="status">Loading collection…</p>
          ) : status === 'error' ? (
            <Notice tone="error">Couldn’t load this collection. Refresh the page to try again.</Notice>
          ) : collection ? (
            <CollectionContent collection={collection} notes={notes} now={now} {...noteProps} />
          ) : (
            <NotFound />
          )}
        </div>
      </main>
    </div>
  )
}

function CollectionContent({ collection, notes, now, onUploaded, onMoveNote, orderError }: ContentProps) {
  return (
    <>
      {/* Breadcrumb, title and the F1 "Upload material" button */}
      <CollectionHead collection={collection} noteCount={notes.length} onUploaded={onUploaded} />
      <NotesSection notes={notes} now={now} onMove={onMoveNote} orderError={orderError} />
    </>
  )
}

function NotFound() {
  return (
    <div className="collection__head">
      <Breadcrumbs items={[{ label: 'Collections', href: '/collections' }, { label: 'Not found' }]} />
      <PageHeader
        title="We couldn’t find that collection"
        summary="It may have been removed, or the link is wrong. Go back to Collections to pick another."
      />
      <p className="collections__empty">
        <a href="/collections">Back to Collections</a>
      </p>
    </div>
  )
}
