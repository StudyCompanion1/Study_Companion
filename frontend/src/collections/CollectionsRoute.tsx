import { CollectionPage } from './CollectionPage'
import { CollectionsPage } from './CollectionsPage'
import { collections, notes } from './collectionsData'
import { notesFor } from './helpers'
import type { CollectionsRoute as Route } from './routes'

/* Picks the Collections screen for an address (see routes.ts) and hands it its data.
   This is the one place to swap mock data for real API data later. */

export function CollectionsRoute({ route, now }: { route: Route; now?: Date }) {
  if (route.page === 'all') {
    return <CollectionsPage collections={collections} now={now} />
  }

  const collection = collections.find((c) => c.id === route.collectionId)
  return <CollectionPage collection={collection} notes={notesFor(route.collectionId, notes)} now={now} />
}
