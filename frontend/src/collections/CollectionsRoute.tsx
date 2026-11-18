import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../auth/api'
import { createCollection, getCollection, listCollections } from './api'
import { listMaterials, reorderMaterials, type Material } from '../materials/api'
import { MaterialView } from '../materials/MaterialView'
import { materialToNote } from '../materials/toNote'
import { CollectionPage } from './CollectionPage'
import { CollectionsPage } from './CollectionsPage'
import type { CollectionsRoute as Route } from './routes'
import type { Collection, LoadStatus, NewCollection } from './types'

export function CollectionsRoute({ route, now }: { route: Route; now?: Date }) {
  if (route.page === 'all') {
    return <CollectionsIndex now={now} />
  }
  if (route.page === 'material') {
    return <MaterialView key={route.materialId} collectionId={route.collectionId} materialId={route.materialId} />
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
  const [materials, setMaterials] = useState<Material[]>([])
  const [orderError, setOrderError] = useState('')
  // Order saves run one after another, so a slow save can't overwrite a newer order
  const saving = useRef(Promise.resolve())

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

  useEffect(() => {
    // The uploaded files are extra: if they can't load, the page still works without them
    const controller = new AbortController()
    listMaterials(id, controller.signal).then((list) => {
      if (!controller.signal.aborted && Array.isArray(list)) setMaterials(list)
    }).catch(() => {})
    return () => controller.abort()
  }, [id])

  function moveMaterial(materialId: string, toIndex: number) {
    const from = materials.findIndex((material) => material.id === materialId)
    if (from === -1) return
    const next = [...materials]
    next.splice(toIndex, 0, ...next.splice(from, 1))
    setMaterials(next)
    setOrderError('')

    const ids = next.map((material) => material.id)
    saving.current = saving.current.then(() => reorderMaterials(id, ids)).catch(async () => {
      setOrderError('Couldn’t save the new order. The list has been reset; please try again.')
      // Show what is really saved
      const saved = await listMaterials(id).catch(() => null)
      if (saved) setMaterials(saved)
    })
  }

  return (
    <CollectionPage
      collection={collection}
      notes={materials.map((material) => materialToNote(material, id))}
      status={status}
      now={now}
      onUploaded={(material) => setMaterials((current) => [material, ...current])}
      onMoveNote={moveMaterial}
      orderError={orderError}
    />
  )
}
