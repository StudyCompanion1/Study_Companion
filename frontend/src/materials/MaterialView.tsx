import { useEffect, useState } from 'react'
import { ApiError } from '../auth/api'
import { getCollection } from '../collections/api'
import { Breadcrumbs } from '../collections/Breadcrumbs'
import { FileChip } from '../collections/FileChip'
import { formatLength } from '../collections/helpers'
import { collectionHref } from '../collections/routes'
import type { Collection } from '../collections/types'
import { Icon } from '../components/Icon'
import { NavRail } from '../components/NavRail'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import type { Material } from './api'
import { PageRows } from './PageRows'
import { materialToNote } from './toNote'
import { getPages, listNotes, openMaterial, type Page } from './viewerApi'
import '../collections/CollectionsPage.css'
import '../collections/CollectionPage.css'
import '../components/PageHeader.css'
import './MaterialView.css'

/* The material view: one uploaded file on the left and the student's notes on the right, a notes
   box beside each page or slide (PageRows.tsx). Both sides are one list, so they scroll together
   and each note stays next to its page. Opening this page marks the file opened.
   Address: /collections/{collectionId}/materials/{materialId} (collections/routes.ts). */

type Loaded = { material: Material; collection: Collection; notes: Record<number, string> }

export function MaterialView({ collectionId, materialId }: { collectionId: string; materialId: string }) {
  const [loaded, setLoaded] = useState<Loaded>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  // null until loaded; [] when the file can't be previewed (notes still work)
  const [pages, setPages] = useState<Page[] | null>(null)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    Promise.all([openMaterial(materialId, signal), getCollection(collectionId, signal), listNotes(materialId, signal)])
      .then(([material, collection, notes]) => {
        if (signal.aborted) return
        if (material.collection_id !== collection.id) return setStatus('missing')
        setLoaded({ material, collection, notes: Object.fromEntries(notes.map((note) => [note.page, note.text])) })
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (!signal.aborted) setStatus(error instanceof ApiError && error.status === 404 ? 'missing' : 'error')
      })
    getPages(materialId, signal)
      .then((list) => !signal.aborted && setPages(list))
      .catch((error: unknown) => {
        if (signal.aborted) return
        setPreviewError(error instanceof ApiError ? error.message : 'This file couldn’t be shown.')
        setPages([])
      })
    return () => controller.abort()
  }, [collectionId, materialId])

  return (
    <div className="collections">
      <NavRail active="Collections" />
      <main className="collections__main">
        <div className="collections__page material-view">
          {status === 'loading' ? (
            <p className="collections__empty" role="status">Loading file…</p>
          ) : status === 'error' ? (
            <Notice tone="error">Couldn’t load this file. Refresh the page to try again.</Notice>
          ) : status === 'missing' || !loaded ? (
            <NotFound collectionId={collectionId} />
          ) : (
            <>
              <Head {...loaded} />
              {pages === null ? (
                <p className="collections__empty" role="status">Loading pages…</p>
              ) : (
                <PageRows material={loaded.material} pages={pages} initialNotes={loaded.notes} previewError={previewError} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

/** Laid out like the Design doc's note-view wireframe: back arrow, title and file chip. Its
    other header controls (Text size, Quiz me, an attached recording) would go beside these. */
function Head({ material, collection }: Loaded) {
  const note = materialToNote(material, collection.id)
  const summary = [note.length && formatLength(note.length), `In ${collection.name}`].filter(Boolean).join(' · ')
  return (
    <div className="collection__head">
      <Breadcrumbs
        items={[
          { label: 'Collections', href: '/collections' },
          { label: collection.name, href: collectionHref(collection.id) },
          { label: material.title },
        ]}
      />
      <div className="material-head">
        <a className="material-head__back" href={collectionHref(collection.id)} aria-label={`Back to ${collection.name}`}>
          <Icon name="arrowLeft" size={20} />
        </a>
        <div className="material-head__text">
          <div className="material-head__title-row">
            <h1 className="page-header__title">{material.title}</h1>
            <FileChip kind={note.material.kind} fileName={material.file_name} />
          </div>
          <p className="page-header__summary">{summary}</p>
        </div>
      </div>
    </div>
  )
}

function NotFound({ collectionId }: { collectionId: string }) {
  return (
    <div className="collection__head">
      <Breadcrumbs items={[{ label: 'Collections', href: '/collections' }, { label: 'Not found' }]} />
      <PageHeader
        title="We couldn’t find that file"
        summary="It may have been removed, or the link is wrong. Go back to the collection to pick another."
      />
      <p className="collections__empty">
        <a href={collectionHref(collectionId)}>Back to the collection</a>
      </p>
    </div>
  )
}
