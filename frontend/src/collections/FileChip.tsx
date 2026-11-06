import { materialLabel } from './helpers'
import { MaterialIcon } from './MaterialIcon'
import type { MaterialKind } from './types'
import './FileChip.css'

/* The study material attached to a note: type icon, type word, file name as uploaded.
   Figma: Library and Wireframes → FileChip (pdf, slides, doc, audio). Long names are cut off
   with "…", so the full name goes in `title` (hover) and is always in the accessible text. */

export function FileChip({ kind, fileName }: { kind: MaterialKind; fileName: string }) {
  return (
    <span className="file-chip" title={fileName}>
      <MaterialIcon kind={kind} />
      <span className="file-chip__kind">{materialLabel(kind)}</span>
      <span className="file-chip__name">{fileName}</span>
    </span>
  )
}
