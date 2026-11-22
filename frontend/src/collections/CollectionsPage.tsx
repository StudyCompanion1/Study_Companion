import { useRef } from 'react'
import { NavRail } from '../components/NavRail'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { CollectionCard } from './CollectionCard'
import { groupByTerm, termSummary } from './helpers'
import { NewCollectionDialog } from './NewCollectionDialog'
import { collectionHref } from './routes'
import type { Collection, LoadStatus, NewCollection } from './types'
import './CollectionsPage.css'

/* Screen 1 — Figma: Screens Desktop → "Collections / Desktop".
   Built from the shared components, same layout pattern as pages/Home.tsx. */

export function CollectionsPage({
  collections,
  now,
  status = 'ready',
  onCreate,
}: {
  collections: Collection[]
  now?: Date
  status?: LoadStatus
  onCreate?: (input: NewCollection) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canCreate = status === 'ready' && onCreate
  const terms = groupByTerm(collections)

  return (
    <div className="collections">
      <NavRail active="Collections" />
      <main className="collections__main">
        <div className="collections__page">
          {/* Temporary, like on Home: handy for checking all three themes. */}
          <div className="collections__theme-row">
            <ThemeSwitcher />
          </div>

          <PageHeader
            title="Collections"
            summary="Your courses and the material you have added to each."
            actionLabel={canCreate ? 'New collection' : undefined}
            actionIcon="collections"
            onAction={() => dialogRef.current?.showModal()}
          />
          {canCreate && <NewCollectionDialog dialogRef={dialogRef} onCreate={onCreate} />}

          {status === 'loading' ? (
            <p className="collections__empty" role="status">Loading collections…</p>
          ) : status === 'error' ? (
            <Notice tone="error">Couldn’t load your collections. Refresh the page to try again.</Notice>
          ) : terms.length === 0 ? (
            <p className="collections__empty">
              No collections yet. Create your first collection to organise your notes by course.
            </p>
          ) : (
            terms.map(({ term, collections: inTerm }) => (
              <section key={term ?? ''} className="collections__section">
                <SectionHeader title={term ?? 'No term'} meta={termSummary(inTerm)} />
                <ul className="collections__grid">
                  {inTerm.map((collection) => (
                    <li key={collection.id}>
                      <CollectionCard collection={collection} href={collectionHref(collection.id)} now={now} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
