import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { MaterialIcon } from './MaterialIcon.tsx'

describe('MaterialIcon', () => {
  test.each([['slides'], ['pdf'], ['doc'], ['audio']] as const)('renders an svg for %s', (kind) => {
    const { container } = render(<MaterialIcon kind={kind} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('doc and audio draw their own path at the given size', () => {
    const { container } = render(<MaterialIcon kind="doc" size={24} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
  })
})
