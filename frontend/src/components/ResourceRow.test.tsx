import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ResourceRow } from './ResourceRow.tsx'

describe('ResourceRow', () => {
  test('renders the title, source, and an external Open link', () => {
    render(<ResourceRow title="The Krebs cycle — overview" source="khanacademy.org" url="https://khanacademy.org/krebs" />)

    expect(screen.getByText('The Krebs cycle — overview')).toBeInTheDocument()
    expect(screen.getByText('khanacademy.org')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Open' })
    expect(link).toHaveAttribute('href', 'https://khanacademy.org/krebs')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
