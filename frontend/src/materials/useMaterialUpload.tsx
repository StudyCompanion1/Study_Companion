import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createCollection } from '../collections/api'
import { collectionHref } from '../collections/routes'
import { Notice } from '../components/Notice'
import { ACCEPT_ATTRIBUTE, checkFile, uploadMaterial, type Material } from './api'
import { ChooseCollectionDialog, type Destination } from './ChooseCollectionDialog'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string }
  | { status: 'done'; fileName: string; collection?: { id: string; name: string } }
  | { status: 'error'; message: string }

/* F1 Upload material. Gives a page everything its "Upload material" button needs:
     const upload = useMaterialUpload({ collectionId })
     <PageHeader actionLabel={upload.label} onAction={upload.open} actionDisabled={upload.busy} />
     {upload.element}
   `element` is the hidden file picker plus the message saying how the upload went.
   Every file goes in a collection: on a collection's page it's that one; anywhere else (Home)
   the student picks one, or makes one, in ChooseCollectionDialog after choosing the file. */

export function useMaterialUpload({
  collectionId,
  onUploaded,
}: { collectionId?: string; onUploaded?: (material: Material) => void } = {}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [waiting, setWaiting] = useState<File | null>(null) // picked on Home, waiting for a collection
  const busy = state.status === 'uploading'

  useEffect(() => {
    if (waiting && !dialogRef.current?.open) dialogRef.current?.showModal()
  }, [waiting])

  async function upload(file: File, collection?: { id: string; name: string }) {
    setState({ status: 'uploading', fileName: file.name })
    try {
      const material = await uploadMaterial(file, collection?.id ?? collectionId)
      setState({ status: 'done', fileName: file.name, collection })
      onUploaded?.(material)
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.'
      setState({ status: 'error', message })
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still triggers a change
    if (!file) return

    const problem = checkFile(file)
    if (problem) {
      setState({ status: 'error', message: problem })
      return
    }
    if (collectionId) {
      void upload(file)
    } else {
      setState({ status: 'idle' })
      setWaiting(file)
    }
  }

  /** From the dialog: makes the new collection first if asked (errors stay in the dialog). */
  async function chooseCollection(destination: Destination) {
    const file = waiting
    if (!file) return
    const collection = 'collection' in destination ? destination.collection : await createCollection(destination.newCollection)
    setWaiting(null)
    dialogRef.current?.close()
    await upload(file, collection)
  }

  const element = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        hidden
        aria-label="Choose course material to upload"
        onChange={handleChange}
      />
      {!collectionId && (
        <ChooseCollectionDialog
          dialogRef={dialogRef}
          fileName={waiting?.name ?? null}
          onChoose={chooseCollection}
          onCancel={() => setWaiting(null)}
        />
      )}
      {state.status === 'uploading' && <Notice tone="info">Uploading “{state.fileName}”…</Notice>}
      {state.status === 'done' && (
        <Notice tone="success" title="Upload complete">
          {state.collection ? (
            <>
              “{state.fileName}” is saved to {state.collection.name}.{' '}
              <a href={collectionHref(state.collection.id)}>Open {state.collection.name}</a>
            </>
          ) : (
            <>“{state.fileName}” is saved to this collection.</>
          )}
        </Notice>
      )}
      {state.status === 'error' && (
        <Notice tone="error" title="Upload failed">
          {state.message}
        </Notice>
      )}
    </>
  )

  return {
    open: () => inputRef.current?.click(),
    busy,
    label: busy ? 'Uploading…' : 'Upload material',
    element,
  }
}
