import { NavRail } from '../components/NavRail'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import type { Material } from '../materials/api'
import { MaterialList } from '../materials/MaterialList'
import { useMaterialUpload } from '../materials/useMaterialUpload'
import { Breadcrumbs } from './Breadcrumbs'
import { collectionSummary, plural, sortByOpened } from './helpers'
import { NoteList } from './NoteList'
import type { Collection, LoadStatus, Note } from './types'
import './CollectionsPage.css'
import './CollectionPage.css'

/* Screen 2 — inside one collection. Figma: Screens Desktop → "Collection / Desktop".
   Same page shell as screen 1 (CollectionsPage.css). `collection` is undefined when the address
   names a collection that doesn't exist (or isn't yours), and the page says so. */

export function CollectionPage({
  collection,
  notes,
  now,
  status = 'ready',
  materials = [],
  onUploaded,
}: {
  collection: Collection | undefined
  notes: Note[]
  now?: Date
  status?: LoadStatus
  /** Files uploaded into this collection (F1), newest first. */
  materials?: Material[]
  onUploaded?: (material: Material) => void
}) {
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
            <CollectionContent collection={collection} notes={notes} now={now} materials={materials} onUploaded={onUploaded} />
          ) : (
            <NotFound />
          )}
        </div>
      </main>
    </div>
  )
}

function CollectionContent({
  collection,
  notes,
  now,
  materials,
  onUploaded,
}: {
  collection: Collection
  notes: Note[]
  now?: Date
  materials: Material[]
  onUploaded?: (material: Material) => void
}) {
  const sorted = sortByOpened(notes)
  const upload = useMaterialUpload({ collectionId: collection.id, onUploaded })

  return (
    <>
      <div className="collection__head">
        <Breadcrumbs items={[{ label: 'Collections', href: '/collections' }, { label: collection.name }]} />
        {/* F1 Upload material: saves the file into this collection (see materials/useMaterialUpload). */}
        <PageHeader
          title={collection.name}
          summary={collectionSummary(collection, notes.length)}
          actionLabel={upload.label}
          onAction={upload.open}
          actionDisabled={upload.busy}
        />
        {upload.element}
      </div>

      {materials.length > 0 && (
        <section className="collections__section">
          <SectionHeader title="Materials" meta={`${plural(materials.length, 'file')} · newest first`} />
          <MaterialList materials={materials} />
        </section>
      )}

      <section className="collections__section">
        <SectionHeader title="Notes" meta={`${plural(notes.length, 'note')} · most recently opened first`} />
        {sorted.length === 0 ? (
          <p className="collections__empty">No notes yet. Upload slides, a PDF or a recording to start.</p>
        ) : (
          <NoteList notes={sorted} now={now} />
        )}
      </section>
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
