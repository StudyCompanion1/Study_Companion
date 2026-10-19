import { describe, expect, test } from 'vitest'
import { collectionHref, matchCollectionsRoute } from './routes'

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
  })

  test('collectionHref round-trips', () => {
    expect(collectionHref('bio201')).toBe('/collections/bio201')
    expect(matchCollectionsRoute(collectionHref('a b'))).toEqual({ page: 'one', collectionId: 'a b' })
  })
})
