import { useRef, useState, type ChangeEvent } from 'react'
import { Notice } from '../components/Notice'
import { ACCEPT_ATTRIBUTE, checkFile, uploadMaterial, type Material } from './api'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string }
  | { status: 'done'; fileName: string }
  | { status: 'error'; message: string }

/* F1 Upload material. Gives a page everything its "Upload material" button needs:
     const upload = useMaterialUpload({ collectionId })
     <PageHeader actionLabel={upload.label} onAction={upload.open} actionDisabled={upload.busy} />
     {upload.element}
   `element` is the hidden file picker plus the message saying how the upload went.
   Without a collectionId (Home), the file is saved to the account but not to a collection. */

export function useMaterialUpload({
  collectionId,
  onUploaded,
}: { collectionId?: string; onUploaded?: (material: Material) => void } = {}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const busy = state.status === 'uploading'

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still triggers a change
    if (!file) return

    const problem = checkFile(file)
    if (problem) {
      setState({ status: 'error', message: problem })
      return
    }

    setState({ status: 'uploading', fileName: file.name })
    try {
      const material = await uploadMaterial(file, collectionId)
      setState({ status: 'done', fileName: file.name })
      onUploaded?.(material)
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.'
      setState({ status: 'error', message })
    }
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
      {state.status === 'uploading' && <Notice tone="info">Uploading “{state.fileName}”…</Notice>}
      {state.status === 'done' && (
        <Notice tone="success" title="Upload complete">
          “{state.fileName}” is saved{collectionId ? ' to this collection' : ' to your account'}.
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
