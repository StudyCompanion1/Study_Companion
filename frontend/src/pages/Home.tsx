import { NavRail } from '../components/NavRail'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { SessionCard, type Session } from '../components/SessionCard'
import { List } from '../components/List'
import { PracticeRow, type PracticeTopic } from '../components/PracticeRow'
import { QuizRow, type QuizResult } from '../components/QuizRow'
import './Home.css'

const sessions: Session[] = [
  { subject: 'BIO 201', kind: 'slides', band: 'green', title: 'Cell structure', meta: 'Slide 4 of 18 · 2 h ago', percent: 40 },
  { subject: 'HIST 204', kind: 'file', band: 'yellow', title: 'Chapter 3 reading', meta: 'Page 12 of 30 · yesterday', percent: 40 },
  { subject: 'CHEM 110', kind: 'slides', band: 'blue', title: 'Acids and bases', meta: 'Slide 9 of 22 · 3 days ago', percent: 41 },
]

const practiceTopics: PracticeTopic[] = [
  { title: 'Mitochondria and ATP', meta: 'BIO 201 · slides 6–9', missedLabel: 'Missed 4 of 6', level: 'low' },
  { title: 'The pH scale', meta: 'CHEM 110 · slides 3–5', missedLabel: 'Missed 3 of 5', level: 'low' },
  { title: 'Causes of the First World War', meta: 'HIST 204 · pages 4–9', missedLabel: 'Missed 2 of 5', level: 'review' },
]

const quizzes: QuizResult[] = [
  { title: 'Cell organelles', meta: 'BIO 201 · 12 Sep', score: 8, outOf: 10, level: 'strong', badgeLabel: 'Mastered' },
  { title: 'Reaction rates', meta: 'CHEM 110 · 10 Sep', score: 6, outOf: 10, level: 'review', badgeLabel: 'Review soon' },
  { title: 'The Treaty of Versailles', meta: 'HIST 204 · 8 Sep', score: 4, outOf: 10, level: 'low', badgeLabel: 'Needs practice' },
]

export function Home() {
  return (
    <div className="home">
      <NavRail active="Home" />
      <main className="home__main">
        <div className="home__page">
          <PageHeader
            title="Good afternoon, Maya"
            summary="You studied for 42 minutes across 3 sessions this week."
            actionLabel="Upload material"
          />

          <section className="home__section">
            <SectionHeader title="Pick up where you left off" meta="3 most recent" />
            <div className="home__sessions">
              {sessions.map((session) => (
                <SessionCard key={session.title} {...session} />
              ))}
            </div>
          </section>

          <div className="home__columns">
            <section className="home__section">
              <SectionHeader title="Needs more practice" meta="Most missed first" />
              <List>
                {practiceTopics.map((topic) => (
                  <PracticeRow key={topic.title} {...topic} />
                ))}
              </List>
            </section>

            <section className="home__section">
              <SectionHeader title="Recent quizzes" meta="Last 7 days" />
              <List>
                {quizzes.map((quiz) => (
                  <QuizRow key={quiz.title} {...quiz} />
                ))}
              </List>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
