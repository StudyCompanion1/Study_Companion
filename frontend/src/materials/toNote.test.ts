import { describe, expect, test } from 'vitest'
import { materialToNote } from './toNote.ts'
import { material } from './uploadTestUtils.ts'

describe('materialToNote', () => {
  test('a PDF is a row of pages that links to its material view', () => {
    expect(materialToNote({ ...material, last_opened_at: '2026-11-17T00:00:00Z' }, 'c1')).toEqual({
      id: '1',
      collectionId: 'c1',
      title: 'Week 1',
      material: { kind: 'pdf', fileName: 'Week 1.pdf' },
      length: { value: 3, unit: 'pages' },
      openedAt: '2026-11-17T00:00:00Z',
      mastery: null,
      href: '/collections/c1/materials/1',
    })
  })

  test('PowerPoint counts slides; images and text files have no length', () => {
    expect(materialToNote({ ...material, file_type: 'ppt', page_count: 18 }, 'c1').length).toEqual({ value: 18, unit: 'slides' })
    const image = materialToNote({ ...material, file_type: 'image', page_count: null }, 'c1')
    expect([image.material.kind, image.length]).toEqual(['image', null])
    expect(materialToNote({ ...material, file_type: 'txt', page_count: null }, 'c1').material.kind).toBe('doc')
  })
})
