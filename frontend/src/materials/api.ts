// Calls to the backend course-material API (backend/app/materials/router.py) — F1 Upload material.
// The login cookie goes along automatically, so uploads are tied to the logged-in student.

import { ApiError, errorMessage } from '../auth/api'

export type MaterialFileType = 'pdf' | 'ppt' | 'docx' | 'txt' | 'image'

export type Material = {
  id: string
  collection_id: string | null
  title: string
  /** The name it was uploaded with, e.g. "Week 1.pdf". */
  file_name: string
  file_type: MaterialFileType
  /** Its place in the collection's list, lowest first (the student can reorder). */
  position: number
  /** Pages or slides; null when it has none (text files, images). */
  page_count: number | null
  /** null = never opened. */
  last_opened_at: string | null
  created_at: string
}

/** Same limit as the backend (MAX_UPLOAD_BYTES), checked here first so a big file fails instantly. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

/** File types the backend accepts (SUPPORTED_EXTENSIONS in ai_processing). */
export const ACCEPTED_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.txt',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.heif',
]

/** For the file picker's `accept`, so it shows supported files first. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(',')

/** A sentence saying why this file can't be uploaded, or null if it looks fine. */
export function checkFile(file: File): string | null {
  const dot = file.name.lastIndexOf('.')
  const extension = dot === -1 ? '' : file.name.slice(dot).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'This file type isn’t supported. Upload a PDF, Word, PowerPoint, text or image file.'
  }
  if (file.size === 0) return 'This file is empty.'
  if (file.size > MAX_UPLOAD_BYTES) return 'File exceeds the 25 MB upload limit.'
  return null
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, errorMessage(await res.json().catch(() => null)))
  return (await res.json()) as T
}

/** Upload one file, into a collection when given one. No Content-Type header: the browser
 *  sets the multipart boundary itself. */
export async function uploadMaterial(file: File, collectionId?: string): Promise<Material> {
  const body = new FormData()
  body.append('file', file)
  if (collectionId) body.append('collection_id', collectionId)
  return parse<Material>(await fetch('/api/materials', { method: 'POST', body }))
}

/** The logged-in student's uploads in their chosen order; only one collection's when given its id. */
export async function listMaterials(collectionId?: string, signal?: AbortSignal): Promise<Material[]> {
  const query = collectionId ? `?collection_id=${encodeURIComponent(collectionId)}` : ''
  return parse<Material[]>(await fetch(`/api/materials${query}`, { cache: 'no-store', signal }))
}

/** Save a collection's new order. Lists every file in it, first to last. */
export async function reorderMaterials(collectionId: string, materialIds: string[]): Promise<void> {
  const res = await fetch('/api/materials/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection_id: collectionId, material_ids: materialIds }),
  })
  if (!res.ok) throw new ApiError(res.status, errorMessage(await res.json().catch(() => null)))
}
