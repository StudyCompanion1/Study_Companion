import { FileChip } from '../collections/FileChip'
import type { MaterialKind } from '../collections/types'
import type { Material, MaterialFileType } from './api'
import './MaterialList.css'

/* The files uploaded into a collection (F1), newest first. Reuses FileChip so they look like
   the material attached to notes. Images have no kind of their own yet, so they show as "Doc". */

const KIND: Record<MaterialFileType, MaterialKind> = { pdf: 'pdf', ppt: 'slides', docx: 'doc', txt: 'doc', image: 'doc' }

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
