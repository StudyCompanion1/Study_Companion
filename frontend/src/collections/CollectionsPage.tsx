import { NavRail } from '../components/NavRail'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { CollectionCard } from './CollectionCard'
import { groupByTerm, termSummary } from './helpers'
import type { Collection } from './types'
import './CollectionsPage.css'

/* Screen 1 — Figma: Screens Desktop → "Collections / Desktop".
   Built from the shared components, same layout pattern as pages/Home.tsx.
   Still to add: the Collections panel (between the rail and the page) with + New collection. */

export function CollectionsPage({ collections, now }: { collections: Collection[]; now?: Date }) {
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

          <PageHeader title="Collections" summary="Your courses and the material you have added to each." />

          {terms.length === 0 ? (
            <p className="collections__empty">
              No collections yet. Create your first collection to organise your notes by course.
            </p>
          ) : (
            terms.map(({ term, collections: inTerm }) => (
              <section key={term} className="collections__section">
                <SectionHeader title={term} meta={termSummary(inTerm)} />
                <ul className="collections__grid">
                  {inTerm.map((collection) => (
                    <li key={collection.id}>
                      {/* Real route once the team picks a router; App.tsx has none yet. */}
                      <CollectionCard collection={collection} href={`/collections/${collection.id}`} now={now} />
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
