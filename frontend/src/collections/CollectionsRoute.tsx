import { useEffect, useState } from 'react'
import { ApiError } from '../auth/api'
import { createCollection, getCollection, listCollections } from './api'
import { CollectionPage } from './CollectionPage'
import { CollectionsPage } from './CollectionsPage'
import type { CollectionsRoute as Route } from './routes'
import type { Collection, LoadStatus, NewCollection } from './types'

export function CollectionsRoute({ route, now }: { route: Route; now?: Date }) {
  if (route.page === 'all') {
    return <CollectionsIndex now={now} />
  }

  return <CollectionDetails key={route.collectionId} id={route.collectionId} now={now} />
}

function CollectionsIndex({ now }: { now?: Date }) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')

  useEffect(() => {
    const controller = new AbortController()
    listCollections(controller.signal).then((list) => {
      if (controller.signal.aborted) return
      setCollections(list)
      setStatus('ready')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('error')
    })
    return () => controller.abort()
  }, [])

  async function saveCollection(input: NewCollection) {
    const collection = await createCollection(input)
    setCollections((current) => [collection, ...current])
  }

  return <CollectionsPage collections={collections} status={status} onCreate={saveCollection} now={now} />
}

function CollectionDetails({ id, now }: { id: string; now?: Date }) {
  const [collection, setCollection] = useState<Collection>()
  const [status, setStatus] = useState<LoadStatus>('loading')

  useEffect(() => {
    const controller = new AbortController()
    getCollection(id, controller.signal).then((found) => {
      if (controller.signal.aborted) return
      setCollection(found)
      setStatus('ready')
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setStatus(error instanceof ApiError && error.status === 404 ? 'ready' : 'error')
    })
    return () => controller.abort()
  }, [id])

  return <CollectionPage collection={collection} notes={[]} status={status} now={now} />
}
