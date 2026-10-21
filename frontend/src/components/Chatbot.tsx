import { useRef, useState, type FormEvent } from 'react'
import './Chatbot.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatResponse = {
  reply?: string
  detail?: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const MAX_FILES = 5
const MAX_FILE_SIZE = 25 * 1024 * 1024

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi! I’m your Study Companion. Ask me a study question, or attach your notes so I can help explain them.',
    },
  ])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  
  function addFiles(selected: FileList | null) {
    if (!selected) return

    setError('')

    const combined = [...files]
    const incoming = Array.from(selected)
    let nextError = ''

    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        nextError = `"${file.name}" exceeds the 25 MB file limit.`
        continue
      }

      const alreadyAdded = combined.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified,
      )

      if (!alreadyAdded) {
        combined.push(file)
      }
    }

    if (combined.length > MAX_FILES) {
      nextError = `Attach no more than ${MAX_FILES} files at once.`
      combined.length = MAX_FILES
    }

    setFiles(combined)
    setError(nextError)

    // Allow selecting the same file again after removing it.
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const question = input.trim()
    if (!question || isSending) return

    setError('')
    setInput('')
    setIsSending(true)

    const nextMessages: Message[] = [
      ...messages,
      { role: 'user', content: question },
    ]
    setMessages(nextMessages)

    const formData = new FormData()
    formData.append('message', question)
    formData.append(
      'history',
      JSON.stringify(
        messages
          .filter((message) => message.content.trim())
          .slice(-20),
      ),
    )

    for (const file of files) {
      formData.append('files', file)
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = (await response.json()) as ChatResponse

      if (!response.ok) {
        throw new Error(
          data.detail || 'The assistant could not answer. Please try again.',
        )
      }

      if (!data.reply) {
        throw new Error('The assistant returned an empty response.')
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.reply! },
      ])

      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to contact the assistant. Check your connection and try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  function startNewChat() {
    if (isSending) return

    setMessages([
      {
        role: 'assistant',
        content:
          'New chat started. What would you like to study? You can keep or remove your attached study materials below.',
      },
    ])
    setInput('')
    setError('')
  }

  return (
    <section className="study-chat" aria-labelledby="study-chat-title">
      <header className="study-chat__header">
        <div>
          <h2 id="study-chat-title">Study Companion Chat</h2>
          <p>Ask questions or get help with your study materials.</p>
        </div>
        <button
          type="button"
          className="study-chat__secondary-button"
          onClick={startNewChat}
          disabled={isSending}
        >
          New chat
        </button>
      </header>

      <div
        className="study-chat__messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.map((message, index) => (
          <article
            key={`${index}-${message.role}`}
            className={`study-chat__message study-chat__message--${message.role}`}
          >
            <span className="study-chat__speaker">
              {message.role === 'user' ? 'You' : 'Study Companion'}
            </span>
            <p>{message.content}</p>
          </article>
        ))}

        {isSending && (
          <p className="study-chat__status" role="status">
            Study Companion is thinking…
          </p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {files.length > 0 && (
        <div className="study-chat__attachments" aria-label="Attached study materials">
          <p className="study-chat__attachments-title">
            Study materials included with each message
          </p>
          <ul>
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={isSending}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="study-chat__form" onSubmit={sendMessage}>
        <label htmlFor="study-chat-input">Your question</label>
        <textarea
          id="study-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question or request an explanation…"
          rows={3}
          maxLength={4000}
          disabled={isSending}
        />

        <div className="study-chat__actions">
          <div>
            <input
              ref={fileInputRef}
              id="study-chat-files"
              className="study-chat__file-input"
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif,.bmp,.gif,.tif,.tiff,.ico,.svg,.psd,.raw,.dng,.cr2,.nef,.arw"
              onChange={(event) => addFiles(event.target.files)}
              disabled={isSending || files.length >= MAX_FILES}
            />
            <label
              className="study-chat__attach-button"
              htmlFor="study-chat-files"
            >
              Attach notes
            </label>
          </div>

          <button
            type="submit"
            className="study-chat__send-button"
            disabled={isSending || !input.trim()}
          >
            {isSending ? 'Sending…' : 'Send message'}
          </button>
        </div>

        <p className="study-chat__hint">
          You can ask general study questions or questions about the attached files.
          Attachments are sent with each message until you remove them.
        </p>

        {error && (
          <p className="study-chat__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
