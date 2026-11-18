import { useRef, useState, type ReactNode } from 'react'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import type { Material } from './api'
import { NoteBox } from './NoteBox'
import { NotesPages } from './NotesPages'
import { PageSource } from './PageSource'
import { useNoteSaver } from './useNoteSaver'
import type { Page } from './viewerApi'

/* The two sides of the material view (MaterialView.tsx): the file on the left and the student's
   notes on the right, in one list, so both sides scroll together.
   - PDFs and slides: one row per page, with a notes box beside each page.
   - Word and text files have no fixed pages: the file is shown whole and the student adds notes
     pages as they need them (NotesPages.tsx).
   - Images, and other files that can't be previewed: one notes box for the whole file.
   The column bar names the two sides. The Design doc's note-view wireframe puts an annotation
   toolbar over the file side and "Read aloud" over the notes side; they would go there. */

export function PageRows({ material, pages, initialNotes, previewError }: {
  material: Material
  pages: Page[]
  initialNotes: Record<number, string>
  previewError: string
}) {
  const saver = useNoteSaver(material.id, initialNotes)
  const addsPages = material.file_type === 'docx' || material.file_type === 'txt'
  const [notePages, setNotePages] = useState(() =>
    [...new Set([1, ...Object.keys(initialNotes).map(Number)])].sort((a, b) => a - b),
  )
  const whole = addsPages || (pages.length <= 1 && material.file_type !== 'pdf' && material.file_type !== 'ppt')
  const label = (n: number) => (whole ? 'this file' : `${material.file_type === 'ppt' ? 'slide' : 'page'} ${n}`)
  const source = (page: Page | undefined) => (
    <PageSource material={material} page={page ?? null} label={label(page?.number ?? 1)} whole={whole} previewError={previewError} />
  )
  const written = Object.values(saver.texts).filter(Boolean).length
  const failed = saver.failedPage

  return (
    <>
      <div className="material-view__status">
        {saver.status === 'error' && failed !== null ? (
          <Notice tone="error" title="Couldn’t save your notes">
            {addsPages
              ? `Notes page ${notePages.indexOf(failed) + 1 || failed} isn’t saved yet.`
              : `Your notes for ${label(failed)} aren’t saved yet.`}{' '}
            Check your connection. <Button size="sm" onClick={saver.retry}>Try again</Button>
          </Notice>
        ) : (
          <p className="material-view__saved" role="status">
            {{ idle: 'Notes save as you type.', saving: 'Saving…', saved: 'All notes saved.', error: '' }[saver.status]}
          </p>
        )}
      </div>

      <div className="material-view__columns" aria-hidden="true">
        <span>{material.file_name}</span>
        <span>My notes{written > 0 && ` · ${written} ${written === 1 ? 'note' : 'notes'}`}</span>
      </div>

      <ol className="material-view__rows">
        {addsPages ? (
          <NotesPages pages={notePages} onPagesChange={setNotePages} saver={saver}>
            {source(pages[0])}
          </NotesPages>
        ) : (
          (pages.length ? pages : [undefined]).map((page) => {
            const n = page?.number ?? 1
            return (
              <PageRow
                key={n}
                label={`Notes for ${label(n)}`}
                value={saver.texts[n] ?? ''}
                onChange={(text) => saver.change(n, text)}
                onBlur={() => saver.flush(n)}
              >
                {source(page)}
              </PageRow>
            )
          })
        )}
      </ol>
    </>
  )
}

/** One page and the notes box beside it. */
function PageRow({ children, ...box }: {
  label: string
  value: string
  onChange: (text: string) => void
  onBlur: () => void
  children: ReactNode
}) {
  const pageRef = useRef<HTMLDivElement>(null)
  return (
    <li className="material-view__row">
      <div ref={pageRef} className="material-view__source">{children}</div>
      <NoteBox {...box} pageRef={pageRef} />
    </li>
  )
}
