/** Which Collections screen an address belongs to, or null when it isn't a Collections address.
 *  "/collections"                         → the list of all collections (screen 1)
 *  "/collections/bio201"                  → inside one collection (screen 2)
 *  "/collections/bio201/materials/m1"     → one file and its notes, side by side (material view)
 *  Kept in a plain function so App.tsx stays tiny and this is easy to unit test. */
export type CollectionsRoute =
  | { page: 'all' }
  | { page: 'one'; collectionId: string }
  | { page: 'material'; collectionId: string; materialId: string }

export function matchCollectionsRoute(pathname: string): CollectionsRoute | null {
  const path = pathname.replace(/\/+$/, '') // "/collections/" behaves like "/collections"
  if (path === '/collections') return { page: 'all' }
  const one = /^\/collections\/([^/]+)$/.exec(path)
  if (one) return { page: 'one', collectionId: decodeURIComponent(one[1]) }
  const material = /^\/collections\/([^/]+)\/materials\/([^/]+)$/.exec(path)
  if (material) {
    return { page: 'material', collectionId: decodeURIComponent(material[1]), materialId: decodeURIComponent(material[2]) }
  }
  return null
}

/** The address of one collection's page. */
export function collectionHref(collectionId: string): string {
  return `/collections/${encodeURIComponent(collectionId)}`
}

/** The address of one file's material view. */
export function materialHref(collectionId: string, materialId: string): string {
  return `${collectionHref(collectionId)}/materials/${encodeURIComponent(materialId)}`
}
