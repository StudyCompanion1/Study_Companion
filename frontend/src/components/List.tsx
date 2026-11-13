import type { ReactNode } from 'react'
import './List.css'

export function List({ children }: { children: ReactNode }) {
  return <div className="list">{children}</div>
}
