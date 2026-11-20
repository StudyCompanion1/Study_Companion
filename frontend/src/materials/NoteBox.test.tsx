import { useRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { NoteBox } from './NoteBox'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('refits long notes when the source page resizes and disconnects on unmount', () => {
  let notify!: () => void
  const observe = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify = callback }
    observe = observe
    disconnect = disconnect
  })
  let pageHeight = 500
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === 'source') return pageHeight
    return 0
  })
  vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockReturnValue(700)

  function Harness() {
    const ref = useRef<HTMLDivElement>(null)
    return <>
      <div ref={ref} data-testid="source" />
      <NoteBox label="Notes" value="Long notes" pageRef={ref} onChange={vi.fn()} onBlur={vi.fn()} />
    </>
  }
  const { unmount } = render(<Harness />)
  const box = screen.getByLabelText('Notes')
  expect(observe).toHaveBeenCalledWith(screen.getByTestId('source'))
  expect(box.style.height).toBe('500px')
  expect(box.style.overflowY).toBe('auto')
  pageHeight = 900
  act(() => notify())
  expect(box.style.height).toBe('700px')
  expect(box.style.overflowY).toBe('hidden')
  unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})
