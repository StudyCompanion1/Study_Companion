import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import SettingsPanel from './SettingsPanel.tsx'
import { defaultSettings } from './Settings.ts'
import { ThemeProvider } from '../theme/ThemeContext.tsx'

function renderPanel(onChange = vi.fn(), onClose = vi.fn()) {
  render(
    <ThemeProvider>
      <SettingsPanel value={defaultSettings} onChange={onChange} onClose={onClose} />
    </ThemeProvider>,
  )
  return { onChange, onClose }
}

describe('SettingsPanel', () => {
  test('calls onClose from the close button', () => {
    const { onClose } = renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('reports a text scale change without altering other settings', () => {
    const { onChange } = renderPanel()

    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: '1.25' } })

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, textScale: 1.25 })
  })

  test('reports a playback speed change', () => {
    const { onChange } = renderPanel()

    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '1.5' } })

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, playbackRate: 1.5 })
  })

  test('toggles color blind mode', () => {
    const { onChange } = renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Color blind mode' }))

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, colorBlind: true })
  })

  test('switching appearance updates which option is pressed', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Light mode' })).toHaveAttribute('aria-pressed', 'false')
  })
})
