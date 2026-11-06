import type { IconName } from './Icon'
import { useState } from 'react'
import SettingsPanel from './SettingsPanel'
import { defaultSettings } from './Settings'
import { Icon } from './Icon'
import './NavRail.css'

// href: pages that exist get a real address; the rest stay '#' until they're built.
const ITEMS: { label: string; icon: IconName; href: string }[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Collections', href: '/collections', icon: 'collections' },
  { label: 'Quizzes', href: '#', icon: 'quiz' },
  { label: 'Practice', href: '#', icon: 'target' },
  { label: 'Search', href: '#', icon: 'search' },
]

export function NavRail({ active = 'Home' }: { active?: string }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
 const [settings, setSettings] = useState(defaultSettings)
  return (
    <nav className="nav-rail" aria-label="Primary">
      <div className="nav-rail__mark" aria-hidden="true">
        SC
      </div>
      <div className="nav-rail__items">
        {ITEMS.map((item) => {
          const isActive = item.label === active
          return (
            <a
              key={item.label}
              href={item.href}
              className="nav-rail__item"
              data-nav={item.label.toLowerCase()}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`nav-rail__icon-pill${isActive ? ' is-active' : ''}`}>
                <Icon name={item.icon} size={24} />
              </span>
              <span className={`nav-rail__label${isActive ? ' is-active' : ''}`}>{item.label}</span>
            </a>
          )
        })}
      </div>
      <div className="nav-rail__spacer" />
            <a
        href="#"
        className="nav-rail__item"
        data-nav="settings"
        onClick={(e) => {
          e.preventDefault()
          setSettingsOpen(open => !open)
        }}
      >
        <span className="nav-rail__icon-pill">
          <Icon name="settings" size={24} />
        </span>
        <span className="nav-rail__label">Settings</span>
      </a>

      {settingsOpen && (
        <SettingsPanel
          value={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </nav>
  )
}
