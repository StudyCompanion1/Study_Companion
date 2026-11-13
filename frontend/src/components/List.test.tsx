import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { List } from './List.tsx'

test('List renders its children', () => {
  render(
    <List>
      <p>Row</p>
    </List>,
  )

  expect(screen.getByText('Row')).toBeInTheDocument()
})
