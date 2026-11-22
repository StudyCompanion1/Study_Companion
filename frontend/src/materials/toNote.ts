import { materialHref } from '../collections/routes'
import type { MaterialKind, Note } from '../collections/types'
import type { Material, MaterialFileType } from './api'

/* An uploaded file shown as one row of a collection's notes (collections/NoteList.tsx), the way
   the Figma mock (collections/collectionsData.ts) shows each lecture, reading or recording. */

const KIND: Record<MaterialFileType, MaterialKind> = { pdf: 'pdf', ppt: 'slides', docx: 'doc', txt: 'doc', image: 'image' }

export function materialToNote(material: Material, collectionId: string): Note {
  const { id, title, file_name, file_type, page_count, last_opened_at } = material
  return {
    id,
    collectionId,
    title,
    material: { kind: KIND[file_type], fileName: file_name },
    length: page_count === null ? null : { value: page_count, unit: file_type === 'ppt' ? 'slides' : 'pages' },
    openedAt: last_opened_at,
    mastery: null, // quizzes aren't built yet
    href: materialHref(collectionId, id),
  }
}
