import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { FileChip } from './FileChip.tsx'

describe('FileChip', () => {
  test('shows the material kind and file name', () => {
    render(<FileChip kind="pdf" fileName="Campbell – Chapter 2.pdf" />)

    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('Campbell – Chapter 2.pdf')).toBeInTheDocument()
  })

  test('puts the full file name in the title for long names cut off by CSS', () => {
    render(<FileChip kind="slides" fileName="Week 4 – Cell structure.pptx" />)

    expect(screen.getByTitle('Week 4 – Cell structure.pptx')).toBeInTheDocument()
  })
})
