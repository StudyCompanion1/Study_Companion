import { PageHeader } from '../components/PageHeader'
import type { Material } from '../materials/api'
import { useMaterialUpload } from '../materials/useMaterialUpload'
import { Breadcrumbs } from './Breadcrumbs'
import { collectionSummary } from './helpers'
import type { Collection } from './types'

/* The top of one collection's page (used by CollectionPage.tsx): breadcrumb, title, summary
   and the "Upload material" button.
   F1: the button uploads into THIS collection (materials/useMaterialUpload.tsx); when it
   finishes, onUploaded hands the new file up so CollectionsRoute.tsx can add it to the list. */

export function CollectionHead({
  collection,
  noteCount,
  onUploaded,
}: {
  collection: Collection
  noteCount: number
  onUploaded?: (material: Material) => void
}) {
  const upload = useMaterialUpload({ collectionId: collection.id, onUploaded })

  return (
    <div className="collection__head">
      <Breadcrumbs items={[{ label: 'Collections', href: '/collections' }, { label: collection.name }]} />
      <PageHeader
        title={collection.name}
        summary={collectionSummary(collection, noteCount)}
        actionLabel={upload.label}
        onAction={upload.open}
        actionDisabled={upload.busy}
      />
      {/* hidden file picker + "Uploading… / Upload complete / Upload failed" message */}
      {upload.element}
    </div>
  )
}
