import { NavRail } from '../components/NavRail'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { Breadcrumbs } from './Breadcrumbs'
import { collectionSummary, plural, sortByOpened } from './helpers'
import { NoteList } from './NoteList'
import type { Collection, Note } from './types'
import './CollectionsPage.css'
import './CollectionPage.css'

/* Screen 2 — inside one collection. Figma: Screens Desktop → "Collection / Desktop".
   Same page shell as screen 1 (CollectionsPage.css). `collection` is undefined when the address
   names a collection that doesn't exist (or isn't yours), and the page says so. */

export function CollectionPage({
  collection,
  notes,
  now,
}: {
  collection: Collection | undefined
  notes: Note[]
  now?: Date
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

          {collection ? (
            <CollectionContent collection={collection} notes={notes} now={now} />
          ) : (
            <NotFound />
          )}
        </div>
      </main>
    </div>
  )
}

function CollectionContent({ collection, notes, now }: { collection: Collection; notes: Note[]; now?: Date }) {
  const sorted = sortByOpened(notes)

  return (
    <>
      <div className="collection__head">
        <Breadcrumbs items={[{ label: 'Collections', href: '/collections' }, { label: collection.name }]} />
        {/* Upload is the Arch group's feature (F1); the button does nothing until it exists. */}
        <PageHeader
          title={collection.name}
          summary={collectionSummary(collection, notes.length)}
          actionLabel="Upload material"
        />
      </div>

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
