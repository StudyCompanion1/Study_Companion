import type { IconName } from './Icon'
import { Icon } from './Icon'
import './NavRail.css'

const ITEMS: { label: string; icon: IconName }[] = [
  { label: 'Home', icon: 'home' },
  { label: 'Collections', icon: 'collections' },
  { label: 'Quizzes', icon: 'quiz' },
  { label: 'Practice', icon: 'target' },
  { label: 'Search', icon: 'search' },
]

export function NavRail({ active = 'Home' }: { active?: string }) {
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
              href="#"
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
      <a href="#" className="nav-rail__item" data-nav="settings">
        <span className="nav-rail__icon-pill">
          <Icon name="settings" size={24} />
        </span>
        <span className="nav-rail__label">Settings</span>
      </a>
    </nav>
  )
}
