import { THEMES, useTheme, type Theme } from '../theme/ThemeContext'
import './ThemeSwitcher.css'

const LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  'high-contrast': 'High contrast',
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-switcher" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          aria-label={`${LABELS[t]} theme`}
          className={`theme-switcher__option${theme === t ? ' is-active' : ''}`}
          onClick={() => setTheme(t)}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  )
}
