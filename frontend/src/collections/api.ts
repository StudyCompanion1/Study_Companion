import { ApiError } from '../auth/api'
import type { Collection, NewCollection } from './types'

interface CollectionResponse {
  id: string
  name: string
  code: string | null
  term: string | null
  updated_at: string
  note_count: number
}

function toCollection({ updated_at, note_count, ...collection }: CollectionResponse): Collection {
  return { ...collection, color: 'blue', updatedAt: updated_at, noteCount: note_count }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/collections${path}`, { cache: 'no-store', ...init })
  if (!response.ok) throw new ApiError(response.status, 'The collections request failed.')
  return response.json() as Promise<T>
}

export async function listCollections(signal: AbortSignal): Promise<Collection[]> {
  const collections = await request<CollectionResponse[]>('', { signal })
  return collections.map(toCollection)
}

export async function getCollection(id: string, signal: AbortSignal): Promise<Collection> {
  return toCollection(await request<CollectionResponse>(`/${encodeURIComponent(id)}`, { signal }))
}

export async function createCollection(input: NewCollection): Promise<Collection> {
  const collection = await request<CollectionResponse>('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return toCollection(collection)
}
