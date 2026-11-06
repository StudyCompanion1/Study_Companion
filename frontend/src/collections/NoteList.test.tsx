import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { notes, MOCK_NOW } from './collectionsData.ts'
import { NoteList } from './NoteList.tsx'

describe('NoteList', () => {
  test('renders one row per note, with its material and length', () => {
    render(<NoteList notes={notes.slice(0, 2)} now={MOCK_NOW} />)

    expect(screen.getByText('Cell structure')).toBeInTheDocument()
    expect(screen.getByText('18 slides')).toBeInTheDocument()
    expect(screen.getByText('Mitochondria and ATP')).toBeInTheDocument()
  })

  test('shows "+ Audio" only when the note has an audio recording attached', () => {
    render(<NoteList notes={[notes[0], notes[2]]} now={MOCK_NOW} />)

    expect(screen.getAllByText('+ Audio')).toHaveLength(1)
  })

  test('shows a mastery badge when scored, and "No quiz yet" otherwise', () => {
    render(<NoteList notes={[notes[0], notes[3]]} now={MOCK_NOW} />)

    expect(screen.getByText('Review soon')).toBeInTheDocument()
    expect(screen.getByText('No quiz yet')).toBeInTheDocument()
  })
})
