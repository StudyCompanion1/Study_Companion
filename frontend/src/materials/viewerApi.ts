// Calls for the material view (MaterialView.tsx): backend/app/materials/viewer.py and notes.py.

import { ApiError, errorMessage } from '../auth/api'
import type { Material } from './api'

/** One page (or slide) of a file, shown on the left of the material view. */
export type Page = {
  number: number
  /** Shown when there's no picture: slide text, or a Word or text file's text. */
  text: string | null
  /** True when pageImageUrl() has a picture of it (PDF pages, images). */
  image: boolean
  width: number | null
  height: number | null
}

/** A note the student wrote next to one page. */
export type PageNote = { page: number; text: string; updated_at: string }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/materials/${path}`, { cache: 'no-store', ...init })
  if (!res.ok) throw new ApiError(res.status, errorMessage(await res.json().catch(() => null)))
  return (await res.json()) as T
}

/** Marks the file opened (the "Opened" column) and returns it. */
export function openMaterial(id: string, signal?: AbortSignal): Promise<Material> {
  return call(`${encodeURIComponent(id)}/open`, { method: 'POST', signal })
}

export function getPages(id: string, signal?: AbortSignal): Promise<Page[]> {
  return call(`${encodeURIComponent(id)}/pages`, { signal })
}

export function pageImageUrl(id: string, page: number): string {
  return `/api/materials/${encodeURIComponent(id)}/pages/${page}/image`
}

export function listNotes(id: string, signal?: AbortSignal): Promise<PageNote[]> {
  return call(`${encodeURIComponent(id)}/notes`, { signal })
}

/** keepalive lets a save started just before leaving the page still finish. */
export function saveNote(id: string, page: number, text: string): Promise<PageNote> {
  return call(`${encodeURIComponent(id)}/notes/${page}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    keepalive: true,
  })
}
