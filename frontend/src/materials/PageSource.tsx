import { useState } from 'react'
import { Notice } from '../components/Notice'
import type { Material } from './api'
import { pageImageUrl, type Page } from './viewerApi'

/* The file side of one row in the material view (PageRows.tsx): a picture of the page (PDFs,
   images), the text of a slide or document, or a note that the file can't be previewed. */

export function PageSource({ material, page, label, whole, previewError }: {
  material: Material
  /** null when the file can't be previewed */
  page: Page | null
  /** "page 2", "slide 2" or "this file" */
  label: string
  /** True when the file is shown whole rather than page by page */
  whole: boolean
  previewError: string
}) {
  if (!page) return <Notice tone="warning" title="Preview isn’t available">{previewError}</Notice>
  if (page.image) return <PagePicture material={material} page={page} label={label} />

  const slide = material.file_type === 'ppt'
  return (
    <div className={`material-view__text${slide ? ' material-view__text--slide' : ''}`}>
      {!whole && <p className="material-view__page-label">{capitalize(label)}</p>}
      {page.text || <span className="material-view__empty">This {whole ? 'file' : slide ? 'slide' : 'page'} has no text.</span>}
    </div>
  )
}

function PagePicture({ material, page, label }: { material: Material; page: Page; label: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return <p className="material-view__empty">{capitalize(label)} couldn’t be shown.</p>
  return (
    <img
      className="material-view__picture"
      src={pageImageUrl(material.id, page.number)}
      alt={material.file_type === 'image' ? material.title : `${capitalize(label)} of ${material.title}`}
      width={page.width ?? undefined}
      height={page.height ?? undefined}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
