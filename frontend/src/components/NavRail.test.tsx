import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NavRail } from './NavRail.tsx'

describe('NavRail', () => {
  test('marks the active item with aria-current, defaulting to Home', () => {
    render(<NavRail />)

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Collections' })).not.toHaveAttribute('aria-current')
  })

  test('marks a different item active when told to', () => {
    render(<NavRail active="Quizzes" />)

    expect(screen.getByRole('link', { name: 'Quizzes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  test('always includes a Settings link', () => {
    render(<NavRail />)

    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  })
})
