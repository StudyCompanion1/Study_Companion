import { useEffect, useId, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { ApiError } from '../auth/api'
import { listCollections } from '../collections/api'
import type { Collection, NewCollection } from '../collections/types'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { TextField } from '../components/TextField'
import '../collections/NewCollectionDialog.css'
import './ChooseCollectionDialog.css'

/* Asked after picking a file with "Upload material" on Home: which collection it goes in.
   Every file lives in a collection, so the student picks one of theirs or makes a new one here
   (same fields as the New collection dialog). useMaterialUpload.tsx opens and closes it. */

export type Destination = { collection: Collection } | { newCollection: NewCollection }

const NEW = 'new'

export function ChooseCollectionDialog({ dialogRef, fileName, onChoose, onCancel }: {
  dialogRef: RefObject<HTMLDialogElement | null>
  /** The picked file; a fresh form (and a fresh list of collections) for each one. */
  fileName: string | null
  /** Rejects to keep the dialog open and show the error. */
  onChoose: (destination: Destination) => Promise<void>
  onCancel: () => void
}) {
  const titleId = useId()
  const [saving, setSaving] = useState(false)

  return (
    <dialog
      ref={dialogRef}
      className="new-collection"
      aria-labelledby={titleId}
      onClose={onCancel}
      onCancel={(event) => {
        if (saving) event.preventDefault()
      }}
    >
      <h2 id={titleId} className="new-collection__title">Add to a collection</h2>
      {fileName && (
        <ChooseForm
          key={fileName}
          fileName={fileName}
          onChoose={onChoose}
          onClose={() => dialogRef.current?.close()}
          saving={saving}
          setSaving={setSaving}
        />
      )}
    </dialog>
  )
}

function ChooseForm({ fileName, onChoose, onClose, saving, setSaving }: {
  fileName: string
  onChoose: (destination: Destination) => Promise<void>
  onClose: () => void
  saving: boolean
  setSaving: (saving: boolean) => void
}) {
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [choice, setChoice] = useState(NEW)
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listCollections(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setCollections(list)
        setChoice(list[0]?.id ?? NEW)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setLoadError(true)
        setCollections([])
        setChoice(NEW)
      })
    return () => controller.abort()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !collections) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const text = (name: string) => String(fields.get(name) ?? '').trim()

    let destination: Destination
    if (choice === NEW) {
      if (!text('name')) {
        setNameError('Enter a collection name.')
        form.querySelector<HTMLInputElement>('[name="name"]')?.focus()
        return
      }
      destination = { newCollection: { name: text('name'), code: text('code') || undefined, term: text('term') || undefined } }
    } else {
      destination = { collection: collections.find((collection) => collection.id === choice)! }
    }

    setSaving(true)
    setFormError('')
    try {
      await onChoose(destination)
    } catch (error) {
      setFormError(error instanceof ApiError && error.status === 401
        ? 'Your session expired. Refresh the page and log in again.'
        : 'Couldn’t create the collection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="new-collection__form" onSubmit={handleSubmit} aria-busy={saving} noValidate>
      <p className="choose-collection__file">“{fileName}” will be saved in the collection you pick.</p>

      {collections === null ? (
        <p role="status">Loading your collections…</p>
      ) : (
        <fieldset className="choose-collection__options" disabled={saving}>
          <legend className="choose-collection__legend">Collection</legend>
          {loadError && <Notice tone="warning">Couldn’t load your collections, but you can make a new one.</Notice>}
          {collections.map((collection) => (
            <Option key={collection.id} value={collection.id} choice={choice} onPick={setChoice}>
              {collection.name}
              {collection.code && <span className="choose-collection__meta"> · {collection.code}</span>}
            </Option>
          ))}
          <Option value={NEW} choice={choice} onPick={setChoice}>New collection</Option>
        </fieldset>
      )}

      {choice === NEW && collections !== null && (
        <div className="choose-collection__new">
          <TextField
            label="Collection name"
            name="name"
            required
            maxLength={100}
            error={nameError}
            onChange={() => setNameError('')}
            readOnly={saving}
          />
          <TextField label="Course code (optional)" name="code" maxLength={30} readOnly={saving} />
          <TextField label="Term (optional)" name="term" maxLength={60} readOnly={saving} />
        </div>
      )}

      {formError && <Notice tone="error">{formError}</Notice>}

      <div className="new-collection__actions">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving || collections === null}>
          {saving ? 'Saving…' : 'Upload'}
        </Button>
      </div>
    </form>
  )
}

function Option({ value, choice, onPick, children }: {
  value: string
  choice: string
  onPick: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="choose-collection__option">
      <input type="radio" name="destination" value={value} checked={choice === value} onChange={() => onPick(value)} />
      <span>{children}</span>
    </label>
  )
}
