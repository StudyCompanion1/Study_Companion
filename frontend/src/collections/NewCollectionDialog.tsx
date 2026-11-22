import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { ApiError } from '../auth/api'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { TextField } from '../components/TextField'
import type { NewCollection } from './types'
import './NewCollectionDialog.css'

export function NewCollectionDialog({ dialogRef, onCreate }: {
  dialogRef: RefObject<HTMLDialogElement | null>
  onCreate: (input: NewCollection) => Promise<void>
}) {
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')

  function resetForm() {
    formRef.current?.reset()
    setNameError('')
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '').trim()
    const code = String(fields.get('code') ?? '').trim()
    const term = String(fields.get('term') ?? '').trim()

    setFormError('')
    if (!name) {
      setNameError('Enter a collection name.')
      form.querySelector<HTMLInputElement>('[name="name"]')?.focus()
      return
    }

    savingRef.current = true
    setSaving(true)
    try {
      await onCreate({ name, code: code || undefined, term: term || undefined })
      dialogRef.current?.close()
    } catch (error) {
      setFormError(error instanceof ApiError && error.status === 401
        ? 'Your session expired. Refresh the page and log in again.'
        : 'Couldn’t create the collection. Please try again.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="new-collection"
      aria-labelledby={titleId}
      onClose={resetForm}
      onCancel={(event) => {
        if (savingRef.current) event.preventDefault()
      }}
    >
      <h2 id={titleId} className="new-collection__title">New collection</h2>
      <form ref={formRef} className="new-collection__form" onSubmit={handleSubmit} aria-busy={saving} noValidate>
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

        {formError && <Notice tone="error">{formError}</Notice>}

        <div className="new-collection__actions">
          <Button onClick={() => dialogRef.current?.close()} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create collection'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
