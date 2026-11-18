import { SectionHeader } from '../components/SectionHeader'
import { FileChip } from '../collections/FileChip'
import { plural } from '../collections/helpers'
import type { MaterialKind } from '../collections/types'
import type { Material, MaterialFileType } from './api'
import './MaterialList.css'

/* F1: the files uploaded into a collection, newest first, shown on CollectionPage.tsx.
   Reuses FileChip so they look like the material attached to notes. */

// FileChip only knows four kinds; images have no kind of their own yet, so they show as "Doc"
const KIND: Record<MaterialFileType, MaterialKind> = { pdf: 'pdf', ppt: 'slides', docx: 'doc', txt: 'doc', image: 'doc' }

/** The "Materials" section; renders nothing until something has been uploaded. */
export function MaterialsSection({ materials }: { materials: Material[] }) {
  if (materials.length === 0) return null
  return (
    <section className="collections__section">
      <SectionHeader title="Materials" meta={`${plural(materials.length, 'file')} · newest first`} />
      <MaterialList materials={materials} />
    </section>
  )
}

export function MaterialList({ materials }: { materials: Material[] }) {
  return (
    <ul className="material-list">
      {materials.map((material) => (
        <li key={material.id}>
          <FileChip kind={KIND[material.file_type]} fileName={material.title} />
        </li>
      ))}
    </ul>
  )
}
