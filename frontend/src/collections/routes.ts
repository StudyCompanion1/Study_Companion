/** Which Collections screen an address belongs to, or null when it isn't a Collections address.
 *  "/collections"         → the list of all collections (screen 1)
 *  "/collections/bio201"  → inside one collection (screen 2)
 *  Kept in a plain function so App.tsx stays tiny and this is easy to unit test. */
export type CollectionsRoute = { page: 'all' } | { page: 'one'; collectionId: string }

export function matchCollectionsRoute(pathname: string): CollectionsRoute | null {
  const path = pathname.replace(/\/+$/, '') // "/collections/" behaves like "/collections"
  if (path === '/collections') return { page: 'all' }
  const match = /^\/collections\/([^/]+)$/.exec(path)
  if (match) return { page: 'one', collectionId: decodeURIComponent(match[1]) }
  return null
}

/** The address of one collection's page. */
export function collectionHref(collectionId: string): string {
  return `/collections/${encodeURIComponent(collectionId)}`
}
