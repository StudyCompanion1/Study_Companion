import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { QuizRow } from './QuizRow.tsx'

describe('QuizRow', () => {
  test('renders the score and mastery badge', () => {
    render(<QuizRow title="Cell organelles" meta="BIO 201" score={8} outOf={10} level="strong" badgeLabel="Mastered" />)

    expect(screen.getByText('Cell organelles')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('/10')).toBeInTheDocument()
    expect(screen.getByText('Mastered')).toBeInTheDocument()
  })
})
