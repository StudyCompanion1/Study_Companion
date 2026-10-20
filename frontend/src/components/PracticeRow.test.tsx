import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PracticeRow } from './PracticeRow.tsx'

describe('PracticeRow', () => {
  test('renders the topic and an accessible, specific practice action', () => {
    render(<PracticeRow title="The pH scale" meta="CHEM 110" missedLabel="Missed 3 of 5" level="low" />)

    expect(screen.getByText('The pH scale')).toBeInTheDocument()
    expect(screen.getByText('CHEM 110')).toBeInTheDocument()
    expect(screen.getByText('Missed 3 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Practice The pH scale' })).toBeInTheDocument()
  })
})
