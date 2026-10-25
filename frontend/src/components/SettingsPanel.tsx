import { useTheme } from '../theme/ThemeContext';
import { useId, useState } from 'react'
import type { Settings } from './Settings';
import './SettingsPanel.css';
import { logout } from '../auth/api'

export interface SettingsPanelProps {
  value: Settings;
  onChange: (value: Settings) => void;
  onClose: () => void;
}
/** Controlled panel: the host owns persistence and applies settings to content/audio. */
export default function SettingsPanel({ value, onChange, onClose }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const id = useId();
  const update = (patch: Partial<Settings>) => onChange({ ...value, ...patch });
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

async function handleLogout() {
  setLoggingOut(true)
  setLogoutError('')

  try {
    await logout()
    window.location.assign('/')
  } catch {
    setLogoutError('Could not log out. Please try again.')
    setLoggingOut(false)
  }
}

  return <aside className="sc-settings" aria-labelledby={`${id}-title`}>
    <header className="sc-settings__header"><h2 id={`${id}-title`}>Settings / Accessibility</h2><button className="sc-settings__close" type="button" onClick={onClose} aria-label="Close settings"><span aria-hidden="true">×</span></button></header>
    <div className="sc-settings__body">
      <section className="sc-settings__section"><label htmlFor={`${id}-text`}>Text size</label><div className="sc-settings__slider"><span aria-hidden="true">A</span><input id={`${id}-text`} type="range" min="0.8" max="1.5" step="0.05" value={value.textScale} aria-valuetext={`${Math.round(value.textScale * 100)} percent`} onChange={e => update({ textScale: Number(e.target.value) })} /><span className="sc-settings__large" aria-hidden="true">A</span></div></section>
      <section className="sc-settings__section"><label htmlFor={`${id}-speed`}>Playback speed</label><div className="sc-settings__slider"><span aria-hidden="true">0.5×</span><input id={`${id}-speed`} type="range" min="0.5" max="2" step="0.1" value={value.playbackRate} aria-valuetext={`${value.playbackRate} times normal speed`} onChange={e => update({ playbackRate: Number(e.target.value) })} /><span aria-hidden="true">2×</span></div></section>
      <section
  className="sc-settings__section"
  aria-labelledby={`${id}-appearance`}
>
  <h3 id={`${id}-appearance`}>Appearance</h3>

  <button
    className="sc-settings__option"
    type="button"
    aria-pressed={theme === 'dark'}
    onClick={() => setTheme('dark')}
  >
    Dark
  </button>

  <button
    className="sc-settings__option"
    type="button"
    aria-pressed={theme === 'high-contrast'}
    onClick={() => setTheme('high-contrast')}
  >
    High contrast
  </button>

  <button
    className="sc-settings__option"
    type="button"
    aria-pressed={theme === 'light'}
    onClick={() => setTheme('light')}
  >
    Light mode
  </button>

  <button
    className="sc-settings__option"
    type="button"
    aria-pressed={value.colorBlind}
    aria-describedby={`${id}-color-help`}
    onClick={() => update({ colorBlind: !value.colorBlind })}
  >
    Color blind mode
  </button>

  <p id={`${id}-color-help`} className="sc-settings__help">
    Use colors that are easier to distinguish.
  </p>
</section>
    </div>

    <footer className="sc-settings__footer">
      {logoutError && <p role="alert">{logoutError}</p>}

      <button
        type="button"
        className="sc-settings__option"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </footer>
  </aside>;
}
