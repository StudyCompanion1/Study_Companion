import { fireEvent, screen } from '@testing-library/react'
import type { Material } from './api'

/* Test-only helpers shared by the F1 tests (useMaterialUpload*.test.tsx, CollectionMaterials.test.tsx). */

export const material: Material = {
  id: '1', collection_id: null, title: 'Week 1', file_type: 'pdf', created_at: '2026-11-12T00:00:00Z',
}

/** The hidden <input type="file"> that the "Upload material" button opens. */
export function filePicker() {
  return screen.getByLabelText<HTMLInputElement>('Choose course material to upload')
}

/** What the browser does when the student picks a file (null = closed the picker). */
export function choose(file: File | null) {
  fireEvent.change(filePicker(), { target: { files: file ? [file] : [] } })
}

/** A fake backend response. */
export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}
