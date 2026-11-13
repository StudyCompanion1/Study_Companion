import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Breadcrumbs } from './Breadcrumbs.tsx'

describe('Breadcrumbs', () => {
  test('earlier crumbs are links, the last is the current page', () => {
    render(
      <Breadcrumbs items={[{ label: 'Collections', href: '/collections' }, { label: 'Cell biology' }]} />,
    )

    const link = screen.getByRole('link', { name: 'Collections' })
    expect(link).toHaveAttribute('href', '/collections')
    expect(screen.getByText('Cell biology')).toHaveAttribute('aria-current', 'page')
  })

  test('a single crumb renders as the current page with no link', () => {
    render(<Breadcrumbs items={[{ label: 'Collections' }]} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Collections')).toHaveAttribute('aria-current', 'page')
  })
})
