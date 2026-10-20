import type { Collection, Note } from './types'

/* Mock data copied from the Figma screens (Collections / Desktop and Collection / Desktop).
   Replace with API calls once the Arch group's collections endpoints exist.

   Times are written relative to MOCK_NOW so the labels ("2 h ago", "Yesterday"…) always match
   Figma, whatever today's date is. Pass MOCK_NOW as `now` to formatRelative in the preview. */

export const MOCK_NOW = new Date('2026-10-13T16:00:00')

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function ago(ms: number): string {
  return new Date(MOCK_NOW.getTime() - ms).toISOString()
}

export const collections: Collection[] = [
  { id: 'bio201', code: 'BIO 201', name: 'Cell biology', term: 'Autumn 2026', color: 'green', noteCount: 12, updatedAt: ago(2 * HOUR) },
  { id: 'chem110', code: 'CHEM 110', name: 'Intro to chemistry', term: 'Autumn 2026', color: 'blue', noteCount: 8, updatedAt: ago(1 * DAY) },
  { id: 'hist204', code: 'HIST 204', name: 'Modern Europe, 1870–1945', term: 'Autumn 2026', color: 'yellow', noteCount: 15, updatedAt: ago(3 * DAY) },
  { id: 'psy101', code: 'PSY 101', name: 'Foundations of psychology', term: 'Autumn 2026', color: 'pink', noteCount: 6, updatedAt: ago(7 * DAY) },
]

export const notes: Note[] = [
  {
    id: 'n1', collectionId: 'bio201', title: 'Cell structure',
    material: { kind: 'slides', fileName: 'Week 4 – Cell structure.pptx', hasAudio: true },
    length: { value: 18, unit: 'slides' }, openedAt: ago(2 * HOUR), mastery: 'review',
  },
  {
    id: 'n2', collectionId: 'bio201', title: 'Mitochondria and ATP',
    material: { kind: 'slides', fileName: 'Week 5 – Mitochondria and ATP.pptx', hasAudio: true },
    length: { value: 22, unit: 'slides' }, openedAt: ago(1 * DAY), mastery: 'low',
  },
  {
    id: 'n3', collectionId: 'bio201', title: 'Chapter 2 reading',
    material: { kind: 'pdf', fileName: 'Campbell – Chapter 2.pdf' },
    length: { value: 34, unit: 'pages' }, openedAt: ago(3 * DAY), mastery: 'strong',
  },
  {
    id: 'n4', collectionId: 'bio201', title: 'Lecture 6 recording',
    material: { kind: 'audio', fileName: 'Lecture 6.m4a' },
    length: { value: 48, unit: 'min' }, openedAt: ago(4 * DAY), mastery: null,
  },
  {
    id: 'n5', collectionId: 'bio201', title: 'Membrane transport',
    material: { kind: 'slides', fileName: 'Week 3 – Membrane transport.pptx', hasAudio: true },
    length: { value: 16, unit: 'slides' }, openedAt: ago(7 * DAY), mastery: 'strong',
  },
  {
    id: 'n6', collectionId: 'bio201', title: 'Lab 2 write-up',
    material: { kind: 'doc', fileName: 'Lab 2 – Osmosis.docx' },
    length: { value: 6, unit: 'pages' }, openedAt: ago(8 * DAY), mastery: null,
  },
  {
    id: 'n7', collectionId: 'bio201', title: 'Enzymes',
    material: { kind: 'slides', fileName: 'Week 2 – Enzymes.pptx' },
    length: { value: 20, unit: 'slides' }, openedAt: ago(14 * DAY), mastery: 'review',
  },
  {
    id: 'n8', collectionId: 'bio201', title: 'Chapter 1 reading',
    material: { kind: 'pdf', fileName: 'Campbell – Chapter 1.pdf' },
    length: { value: 28, unit: 'pages' }, openedAt: ago(15 * DAY), mastery: 'strong',
  },
  {
    id: 'n9', collectionId: 'bio201', title: 'Lecture 3 recording',
    material: { kind: 'audio', fileName: 'Lecture 3.m4a' },
    length: { value: 51, unit: 'min' }, openedAt: ago(21 * DAY), mastery: null,
  },
  {
    id: 'n10', collectionId: 'bio201', title: 'Macromolecules',
    material: { kind: 'slides', fileName: 'Week 1 – Macromolecules.pptx' },
    length: { value: 24, unit: 'slides' }, openedAt: ago(22 * DAY), mastery: 'strong',
  },
  {
    id: 'n11', collectionId: 'bio201', title: 'Course overview',
    material: { kind: 'pdf', fileName: 'BIO 201 Syllabus.pdf' },
    length: { value: 4, unit: 'pages' }, openedAt: ago(30 * DAY), mastery: null,
  },
  {
    id: 'n12', collectionId: 'bio201', title: 'Lecture 1 recording',
    material: { kind: 'audio', fileName: 'Lecture 1.m4a' },
    length: { value: 47, unit: 'min' }, openedAt: ago(31 * DAY), mastery: null,
  },
]
