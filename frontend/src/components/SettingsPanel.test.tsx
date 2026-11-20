import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import SettingsPanel from './SettingsPanel.tsx'
import { defaultSettings } from './Settings.ts'
import { ThemeProvider } from '../theme/ThemeContext.tsx'

afterEach(() => vi.unstubAllGlobals())

function renderPanel(onChange = vi.fn(), onClose = vi.fn(), panel: 'settings' | 'accessibility' = 'accessibility') {
  render(
    <ThemeProvider>
      <SettingsPanel id={`${panel}-panel`} panel={panel} value={defaultSettings} onChange={onChange} onClose={onClose} />
    </ThemeProvider>,
  )
  return { onChange, onClose }
}

describe('SettingsPanel', () => {
  test('shows a logout failure and lets the student retry', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)
    renderPanel(vi.fn(), vi.fn(), 'settings')
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not log out. Please try again.')
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not log out')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('switches high contrast and light appearance', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'High Contrast' }))
    expect(screen.getByRole('button', { name: 'High Contrast' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Light Mode' }))
    expect(screen.getByRole('button', { name: 'Light Mode' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'High Contrast' })).toHaveAttribute('aria-pressed', 'false')
  })
  test('calls onClose from the close button', () => {
    const { onClose } = renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Close accessibility' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('reports a text scale change without altering other settings', () => {
    const { onChange } = renderPanel()

    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: '1.25' } })

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, textScale: 1.25 })
  })

  test('reports a playback speed change', () => {
   const {onChange} = renderPanel()

    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '1.5' } })

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, playbackRate: 1.5 })
  })

  test('toggles color blind mode', () => {
   renderPanel()

    const colorBlindBtn = screen.getByRole('button', { name: 'Color Blind Mode' })
    fireEvent.click(colorBlindBtn)

    expect(colorBlindBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('switching appearance updates which option is pressed', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Dark Mode' }))

    expect(screen.getByRole('button', { name: 'Dark Mode' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Light Mode' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('shows appearance in both modes and keeps logout in Settings only', () => {
    const { unmount } = render(
      <ThemeProvider>
        <SettingsPanel id="settings-panel" panel="settings" value={defaultSettings} onChange={vi.fn()} onClose={vi.fn()} />
      </ThemeProvider>,
    )

    expect(screen.getByRole('button', { name: 'Dark Mode' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Text size')).not.toBeInTheDocument()
    unmount()

    renderPanel(vi.fn(), vi.fn(), 'accessibility')
    expect(screen.getByRole('button', { name: 'Dark Mode' })).toBeInTheDocument()
    expect(screen.getByLabelText('Text size')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })
})
