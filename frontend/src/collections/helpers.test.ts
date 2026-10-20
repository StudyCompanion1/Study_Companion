import { describe, expect, test } from 'vitest'
import { collections, notes, MOCK_NOW } from './collectionsData'
import {
  collectionSummary,
  formatLength,
  formatRelative,
  groupByTerm,
  masteryLabel,
  materialLabel,
  notesFor,
  plural,
  sortByOpened,
  termSummary,
} from './helpers'
import type { Collection } from './types'

const NOW = new Date('2026-10-13T16:00:00')
const minus = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

describe('formatLength', () => {
  test('slides, pages and minutes', () => {
    expect(formatLength({ value: 18, unit: 'slides' })).toBe('18 slides')
    expect(formatLength({ value: 34, unit: 'pages' })).toBe('34 pages')
    expect(formatLength({ value: 48, unit: 'min' })).toBe('48 min')
  })

  test('singular for one', () => {
    expect(formatLength({ value: 1, unit: 'slides' })).toBe('1 slide')
    expect(formatLength({ value: 1, unit: 'pages' })).toBe('1 page')
  })
})

describe('formatRelative', () => {
  test.each([
    [10 * 1000, 'Just now'],
    [5 * 60 * 1000, '5 min ago'],
    [2 * HOUR, '2 h ago'],
    [1 * DAY, 'Yesterday'],
    [3 * DAY, '3 days ago'],
    [7 * DAY, 'Last week'],
    [13 * DAY, 'Last week'],
    [14 * DAY, '2 weeks ago'],
    [22 * DAY, '3 weeks ago'],
  ])('%i ms ago → %s', (ms, expected) => {
    expect(formatRelative(minus(ms), NOW)).toBe(expected)
  })

  test('a date in the future is treated as just now', () => {
    expect(formatRelative(new Date(NOW.getTime() + HOUR).toISOString(), NOW)).toBe('Just now')
  })
})

describe('groupByTerm', () => {
  test('groups by term in first-seen order', () => {
    const list: Collection[] = [
      { ...collections[0], id: 'a', term: 'Autumn 2026' },
      { ...collections[1], id: 'b', term: 'Spring 2026' },
      { ...collections[2], id: 'c', term: 'Autumn 2026' },
    ]
    const groups = groupByTerm(list)
    expect(groups.map((g) => g.term)).toEqual(['Autumn 2026', 'Spring 2026'])
    expect(groups[0].collections.map((c) => c.id)).toEqual(['a', 'c'])
  })

  test('empty list gives no groups', () => {
    expect(groupByTerm([])).toEqual([])
  })

  test('the mock data is one term with 4 collections', () => {
    const groups = groupByTerm(collections)
    expect(groups).toHaveLength(1)
    expect(groups[0].collections).toHaveLength(4)
  })
})

describe('sortByOpened', () => {
  test('most recently opened first', () => {
    const shuffled = [notes[4], notes[0], notes[9], notes[2]]
    expect(sortByOpened(shuffled).map((n) => n.id)).toEqual(['n1', 'n3', 'n5', 'n10'])
  })

  test('does not change the original array', () => {
    const original = [notes[4], notes[0]]
    sortByOpened(original)
    expect(original.map((n) => n.id)).toEqual(['n5', 'n1'])
  })
})

describe('notesFor', () => {
  test('only that collection’s notes', () => {
    expect(notesFor('bio201', notes)).toHaveLength(12)
    expect(notesFor('psy101', notes)).toHaveLength(0)
  })
})

describe('plural and termSummary', () => {
  test('plural', () => {
    expect(plural(1, 'note')).toBe('1 note')
    expect(plural(12, 'note')).toBe('12 notes')
  })

  test('matches the Figma summary line', () => {
    expect(termSummary(collections)).toBe('4 collections · 41 notes')
  })
})

describe('mock data matches Figma labels', () => {
  test('card and row times', () => {
    expect(formatRelative(collections[0].updatedAt, MOCK_NOW)).toBe('2 h ago')
    expect(formatRelative(collections[1].updatedAt, MOCK_NOW)).toBe('Yesterday')
    expect(formatRelative(notes[9].openedAt, MOCK_NOW)).toBe('3 weeks ago')
  })
})

describe('labels for screen 2', () => {
  test('masteryLabel uses the Figma words', () => {
    expect(masteryLabel('strong')).toBe('Mastered')
    expect(masteryLabel('review')).toBe('Review soon')
    expect(masteryLabel('low')).toBe('Needs practice')
  })

  test('materialLabel', () => {
    expect(materialLabel('slides')).toBe('Slides')
    expect(materialLabel('pdf')).toBe('PDF')
    expect(materialLabel('doc')).toBe('Doc')
    expect(materialLabel('audio')).toBe('Audio')
  })

  test('collectionSummary matches the Figma subtitle', () => {
    expect(collectionSummary(collections[0], 12)).toBe('BIO 201 · Autumn 2026 · 12 notes')
    expect(collectionSummary(collections[3], 1)).toBe('PSY 101 · Autumn 2026 · 1 note')
  })

  test('BIO 201 has as many notes as its card says', () => {
    expect(notesFor('bio201', notes)).toHaveLength(collections[0].noteCount)
  })
})
