import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { SessionCard } from './SessionCard.tsx'

describe('SessionCard', () => {
  test('renders as a link with the subject, title, meta, and progress', () => {
    render(
      <SessionCard subject="BIO 201" kind="slides" band="green" title="Cell structure" meta="Slide 4 of 18" percent={40} />,
    )

    const link = screen.getByRole('link', { name: /Cell structure/ })
    expect(link).toBeInTheDocument()
    expect(screen.getByText('BIO 201')).toBeInTheDocument()
    expect(screen.getByText('Slide 4 of 18')).toBeInTheDocument()
    expect(screen.getByText('40% through')).toBeInTheDocument()
  })

  test('renders the file icon for file-kind sessions', () => {
    const { container } = render(
      <SessionCard subject="HIST 204" kind="file" band="yellow" title="Chapter 3" meta="Page 12" percent={40} />,
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
