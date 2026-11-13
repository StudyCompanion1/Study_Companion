import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Icon } from './Icon.tsx'

describe('Icon', () => {
  test('renders an svg sized and hidden from screen readers', () => {
    const { container } = render(<Icon name="home" />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  test('respects a custom size', () => {
    const { container } = render(<Icon name="check" size={16} />)

    expect(container.querySelector('svg')).toHaveAttribute('width', '16')
  })
})
