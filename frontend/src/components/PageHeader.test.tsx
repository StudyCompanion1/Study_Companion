import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { PageHeader } from './PageHeader.tsx'

describe('PageHeader', () => {
  test('renders the title and summary without an action by default', () => {
    render(<PageHeader title="Home" summary="Welcome back." />)

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByText('Welcome back.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders and wires up the action button when given a label', () => {
    const onAction = vi.fn()
    render(<PageHeader title="Home" summary="Welcome back." actionLabel="Upload material" onAction={onAction} />)

    fireEvent.click(screen.getByRole('button', { name: 'Upload material' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
