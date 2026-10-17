import { MasteryBadge, type MasteryLevel } from './MasteryBadge'
import './QuizRow.css'

export interface QuizResult {
  title: string
  meta: string
  score: number
  outOf: number
  level: MasteryLevel
  badgeLabel: string
}

export function QuizRow({ title, meta, score, outOf, level, badgeLabel }: QuizResult) {
  return (
    <div className="list-row quiz-row">
      <div className="quiz-row__main">
        <p className="quiz-row__title">{title}</p>
        <p className="quiz-row__meta">{meta}</p>
      </div>
      <div className="quiz-row__score">
        <span className="quiz-row__score-value">{score}</span>
        <span className="quiz-row__score-out-of">/{outOf}</span>
      </div>
      <MasteryBadge level={level} label={badgeLabel} />
    </div>
  )
}
