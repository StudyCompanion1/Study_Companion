import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { SectionHeader } from './SectionHeader.tsx'

test('SectionHeader renders a title heading and meta text', () => {
  render(<SectionHeader title="Recent quizzes" meta="Last 7 days" />)

  expect(screen.getByRole('heading', { name: 'Recent quizzes' })).toBeInTheDocument()
  expect(screen.getByText('Last 7 days')).toBeInTheDocument()
})
