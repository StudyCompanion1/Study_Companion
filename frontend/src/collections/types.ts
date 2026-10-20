import type { MasteryLevel } from '../components/MasteryBadge'

/** The four highlighter colours a student can pick for a collection's band. */
export type HighlightColor = 'green' | 'blue' | 'yellow' | 'pink'

/** One collection = one course, like "BIO 201 Cell biology". */
export interface Collection {
  id: string
  code: string
  name: string
  term: string
  color: HighlightColor
  /** Mocked for now; later the API will count the notes. */
  noteCount: number
  /** ISO date-time of the last edit. */
  updatedAt: string
}

export type MaterialKind = 'slides' | 'pdf' | 'doc' | 'audio'
export type LengthUnit = 'slides' | 'pages' | 'min'

/** One note inside a collection (one lecture, reading or recording). */
export interface Note {
  id: string
  collectionId: string
  title: string
  material: {
    kind: MaterialKind
    fileName: string
    /** True when a lecture recording is attached as well ("+ Audio"). */
    hasAudio?: boolean
  }
  length: { value: number; unit: LengthUnit }
  /** ISO date-time the student last opened it. */
  openedAt: string
  /** null = "No quiz yet". */
  mastery: MasteryLevel | null
}
