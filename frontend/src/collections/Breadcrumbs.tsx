import { Icon } from '../components/Icon'
import './Breadcrumbs.css'

/* "Collections › Cell biology". Every step but the last is a link; the last is the current page.
   Figma: Library and Wireframes → Breadcrumbs. */

export interface Crumb {
  label: string
  /** Leave out on the last crumb (the page you're on). */
  href?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.label} className="breadcrumbs__item">
              {item.href && !isLast ? (
                <a className="breadcrumbs__link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span className="breadcrumbs__current" aria-current="page">
                  {item.label}
                </span>
              )}
              {!isLast && <Icon name="chevronRight" size={16} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
