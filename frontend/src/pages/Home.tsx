import { useEffect, useState } from 'react'
import { NavRail } from '../components/NavRail'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { List } from '../components/List'
import { PracticeRow, type PracticeTopic } from '../components/PracticeRow'
import { QuizRow, type QuizResult } from '../components/QuizRow'
import Chatbot from '../components/Chatbot'
import { useMaterialUpload } from '../materials/useMaterialUpload'
import type { User } from '../auth/api'
import { listCollections } from '../collections/api'
import { collectionHref } from '../collections/routes'
import { CollectionCard } from '../collections/CollectionCard'
import type { Collection, LoadStatus } from '../collections/types'
import './Home.css'

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

export function Home({ user }: { user: User }) {
  const upload = useMaterialUpload()
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsStatus, setCollectionsStatus] = useState<LoadStatus>('loading')

  useEffect(() => {
    const controller = new AbortController()
    listCollections(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setCollections(list)
        setCollectionsStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setCollectionsStatus('error')
      })
    return () => controller.abort()
  }, [])

  return (
    <div className="home"> 
      <NavRail active="Home" />
      <main className="home__main">
        <div className="home__page">
          <PageHeader
            title={`Good afternoon, ${user.name}`}
            summary="You studied for 42 minutes across 3 sessions this week."
            actionLabel={upload.label}
            onAction={upload.open}
            actionDisabled={upload.busy}
          />
          {upload.element}

          <section className="home__section">
            <SectionHeader title="Pick up where you left off" meta="3 most recent" />
            {collectionsStatus === 'loading' && <p>Loading collections…</p>}
            {collectionsStatus === 'error' && <p>Couldn't load your collections.</p>}
            {collectionsStatus === 'ready' && collections.length === 0 && (
              <p>No collections yet. Create one to get started.</p>
            )}
            {collectionsStatus === 'ready' && collections.length > 0 && (
              <div className="home__sessions">
                {collections.slice(0, 3).map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} href={collectionHref(collection.id)} />
                ))}
              </div>
            )}
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

        <Chatbot />
      </div>
  )
}
