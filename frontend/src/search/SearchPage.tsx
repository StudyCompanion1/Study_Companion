import { useState, type FormEvent } from 'react'
import { NavRail } from '../components/NavRail'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { TextField } from '../components/TextField'
import { Button } from '../components/Button'
import { List } from '../components/List'
import { ResourceRow, type WebResource } from '../components/ResourceRow'
import { Notice } from '../components/Notice'
import { searchResources } from './api'
import './SearchPage.css'

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error'

export function SearchPage() {
  const [topic, setTopic] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WebResource[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = topic.trim()
    if (!trimmed) return

    setQuery(trimmed)
    setStatus('loading')
    searchResources(trimmed)
      .then((found) => {
        setResults(found)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  return (
    <div className="search-screen">
      <NavRail active="Search" />
      <main className="search-screen__main">
        <div className="search-screen__page">
          <PageHeader title="Search" summary="Type a study topic and we'll pull relevant materials from the web for it." />

          <form className="search-screen__bar" onSubmit={handleSubmit}>
            <TextField
              label="Study topic"
              placeholder="e.g. the Krebs cycle, the causes of World War I"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="search-screen__field"
            />
            <Button type="submit" variant="primary" icon="search" disabled={status === 'loading'}>
              Search
            </Button>
          </form>

          {status === 'loading' && <p role="status">Searching…</p>}

          {status === 'error' && (
            <Notice tone="error" title="Search failed">
              Something went wrong finding resources for “{query}”. Please try again.
            </Notice>
          )}

          {status === 'ready' && results.length === 0 && (
            <Notice tone="info" title="No materials found">
              We couldn't find anything for “{query}”. Try different or fewer words.
            </Notice>
          )}

          {status === 'ready' && results.length > 0 && (
            <section className="search-screen__section">
              <SectionHeader title={`Results for “${query}”`} meta={`${results.length} resource${results.length === 1 ? '' : 's'} found`} />
              <List>
                {results.map((resource) => (
                  <ResourceRow key={resource.url} {...resource} />
                ))}
              </List>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
