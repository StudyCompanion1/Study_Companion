import { PageHeader } from '../components/PageHeader'
import type { Material } from './api'
import { useMaterialUpload } from './useMaterialUpload'

/* Test-only: a tiny page wired up the same way Home.tsx and collections/CollectionHead.tsx
   use the hook. Used by useMaterialUpload*.test.tsx (helpers are in uploadTestUtils.ts). */

export function UploadHarness({ collectionId, onUploaded }: { collectionId?: string; onUploaded?: (m: Material) => void }) {
  const upload = useMaterialUpload({ collectionId, onUploaded })
  return (
    <>
      <PageHeader title="Home" summary="" actionLabel={upload.label} onAction={upload.open} actionDisabled={upload.busy} />
      {upload.element}
    </>
  )
}
