import { describe, expect, test } from 'vitest'
import { collectionHref, matchCollectionsRoute, materialHref } from './routes'

describe('matchCollectionsRoute', () => {
  test('the Collections list', () => {
    expect(matchCollectionsRoute('/collections')).toEqual({ page: 'all' })
    expect(matchCollectionsRoute('/collections/')).toEqual({ page: 'all' })
  })

  test('one collection', () => {
    expect(matchCollectionsRoute('/collections/bio201')).toEqual({ page: 'one', collectionId: 'bio201' })
  })

  test('not a Collections address', () => {
    expect(matchCollectionsRoute('/')).toBeNull()
    expect(matchCollectionsRoute('/quizzes')).toBeNull()
    expect(matchCollectionsRoute('/collectionsX')).toBeNull()
    expect(matchCollectionsRoute('/collections/bio201/notes/n1')).toBeNull()
    expect(matchCollectionsRoute('/collections/bio201/materials')).toBeNull()
  })

  test('one file in a collection (the material view)', () => {
    expect(matchCollectionsRoute('/collections/bio201/materials/m1/')).toEqual({
      page: 'material', collectionId: 'bio201', materialId: 'm1',
    })
    expect(materialHref('a b', 'm/1')).toBe('/collections/a%20b/materials/m%2F1')
    expect(matchCollectionsRoute(materialHref('a b', 'm 1'))).toEqual({ page: 'material', collectionId: 'a b', materialId: 'm 1' })
  })

  test('collectionHref round-trips', () => {
    expect(collectionHref('bio201')).toBe('/collections/bio201')
    expect(matchCollectionsRoute(collectionHref('a b'))).toEqual({ page: 'one', collectionId: 'a b' })
  })
})
