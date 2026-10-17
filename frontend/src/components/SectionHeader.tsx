import './SectionHeader.css'

export function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="section-header">
      <h2 className="section-header__title">{title}</h2>
      <span className="section-header__meta">{meta}</span>
    </div>
  )
}
