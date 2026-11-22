import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ApiError } from '../auth/api'
import { useSession } from '../auth/SessionContext'
import { createCollection } from '../collections/api'
import { collectionHref } from '../collections/routes'
import { GuestLimitNotice } from '../components/GuestLimitNotice'
import { Notice } from '../components/Notice'
import { ACCEPT_ATTRIBUTE, checkFile, uploadMaterial, type Material } from './api'
import { ChooseCollectionDialog, type Destination } from './ChooseCollectionDialog'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string }
  | { status: 'done'; fileName: string; collection?: { id: string; name: string } }
  | { status: 'error'; message: string }

const GUEST_UPLOADS_USED_UP = 'You`ve used your free guest uploads. Create a free account to upload more files.'

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
  const {isGuest, usage, refreshUsage, goToSignUp} = useSession()
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [waiting, setWaiting] = useState<File | null>(null) // picked on Home, waiting for a collection
  const [limitMessage, setLimitMessage] = useState('') // For Guests: Sets when a guest has used up their upload usage.
  const busy = state.status === 'uploading'
  const outOfUploads = isGuest && usage?.uploads_remaining == 0

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
      if (isGuest && err instanceof ApiError && err.status === 403) {
        setState({status: 'idle'})
        setLimitMessage(err.message)
        void refreshUsage()
        return
      }
      const message = err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.'
      setState({ status: 'error', message })
    }
  }

  function open() {
    if (outOfUploads) {
      setLimitMessage(GUEST_UPLOADS_USED_UP)
      return
    }
    setLimitMessage('')
    inputRef.current?.click()
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
      {limitMessage && <GuestLimitNotice message = {limitMessage} onSignUp = {goToSignUp} />}
    </>
  )

  return {
    open,
    busy,
    label: busy ? 'Uploading…' : 'Upload material',
    element,
  }
}
