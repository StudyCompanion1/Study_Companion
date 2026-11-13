// Calls to the backend course-material API (backend/app/materials/router.py) — F1 Upload material.
// The login cookie goes along automatically, so uploads are tied to the logged-in student.

import { ApiError, errorMessage } from '../auth/api'

export type MaterialFileType = 'pdf' | 'ppt' | 'docx' | 'txt' | 'image'

export type Material = {
  id: string
  collection_id: string | null
  title: string
  file_type: MaterialFileType
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

/** The logged-in student's uploads, newest first; only one collection's when given its id. */
export async function listMaterials(collectionId?: string, signal?: AbortSignal): Promise<Material[]> {
  const query = collectionId ? `?collection_id=${encodeURIComponent(collectionId)}` : ''
  return parse<Material[]>(await fetch(`/api/materials${query}`, { cache: 'no-store', signal }))
}
