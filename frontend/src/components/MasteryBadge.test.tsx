import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { MasteryBadge } from './MasteryBadge.tsx'

describe('MasteryBadge', () => {
  test('pairs the level with an icon and a label, not color alone', () => {
    const { container } = render(<MasteryBadge level="strong" label="Mastered" />)

    expect(screen.getByText('Mastered')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('.mastery-badge--strong')).toBeInTheDocument()
  })

  test.each([
    ['low', 'Needs practice'],
    ['review', 'Review soon'],
  ] as const)('renders the %s level', (level, label) => {
    render(<MasteryBadge level={level} label={label} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
