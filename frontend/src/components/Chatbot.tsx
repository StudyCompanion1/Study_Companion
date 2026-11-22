import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from 'react'
import { useSession } from '../auth/SessionContext'
import { GuestLimitNotice } from './GuestLimitNotice'
import './Chatbot.css'

// Types

type Message = {
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
}

type ChatResponse = {
  reply?: string
  detail?: string
  suggestions?: string[]
}

type ChatSize = {
  width: number
  height: number
}

// Constants

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const MAX_FILES = 5
const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_TOTAL_FILE_SIZE = 25 * 1024 * 1024

const DEFAULT_CHAT_SIZE: ChatSize = {
  width: 450,
  height: 600,
}

// Chatbot icon

function ChatIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.95L3 20l1.25-4.25A8.5 8.5 0 1 1 20 11.5Z" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  )
}

// Resize helpers

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function getChatLimits() {
  const mobile = window.innerWidth <= 768
  const availableWidth = Math.max(200, window.innerWidth - 32)

  const availableHeight = Math.max(
    200,
    window.innerHeight - (mobile ? 210 : 120),
  )

  return {
    minWidth: Math.min(300, availableWidth),
    minHeight: Math.min(300, availableHeight),
    maxWidth: availableWidth,
    maxHeight: availableHeight,
  }
}

function constrainSize(size: ChatSize): ChatSize {
  const limits = getChatLimits()

  return {
    width: clamp(
      size.width,
      limits.minWidth,
      limits.maxWidth,
    ),
    height: clamp(
      size.height,
      limits.minHeight,
      limits.maxHeight,
    ),
  }
}

export default function Chatbot() {

  const {isGuest, usage, refreshUsage, goToSignUp} = useSession()
  const [guestLocked, setGuestLocked] = useState(false)

  // Locked once the free questions are used up (also covers page refresh)
  const locked = isGuest && (guestLocked || usage?.chats_remaining === 0)

  // For Guests: Can attach one file per message (server enforces this too).
  const maxFiles = isGuest ? 1 : MAX_FILES


 // open and close 

  const [isOpen, setIsOpen] = useState(false)

  const toggleButtonRef = useRef<HTMLButtonElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  function openChat() {
    setIsOpen(true)
  }

  function closeChat() {
    setIsOpen(false)
    toggleButtonRef.current?.focus()
  }

  useEffect(() => {
    if (isOpen) {
      chatInputRef.current?.focus()
    }
  }, [isOpen])

  // Chat resizing

  const [chatSize, setChatSize] = useState<ChatSize>(
    DEFAULT_CHAT_SIZE,
  )

  const [sizeAnnouncement, setSizeAnnouncement] = useState('')

  const resizeStart = useRef<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  function changeChatSize(amount: number) {
    const current = constrainSize(chatSize)

    const next = constrainSize({
      width: current.width + amount,
      height: current.height + amount,
    })

    setChatSize(next)

    setSizeAnnouncement(
      `Chat window resized to ${next.width} by ${next.height} pixels`,
    )
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    event.preventDefault()

    const current = constrainSize(chatSize)

    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: current.width,
      height: current.height,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleResize(event: PointerEvent<HTMLButtonElement>) {
    if (!resizeStart.current) return

    const start = resizeStart.current
    const deltaX = start.x - event.clientX
    const deltaY = start.y - event.clientY

    const next = constrainSize({
      width: start.width + deltaX,
      height: start.height + deltaY,
    })

    setChatSize(next)
  }

  function stopResize() {
    if (!resizeStart.current) return

    resizeStart.current = null
    setSizeAnnouncement('Chat window size updated')
  }

  useEffect(() => {
    function handleWindowResize() {
      setChatSize((current) => constrainSize(current))
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])

  // Messages

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
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = messagesContainerRef.current

    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, isSending])

  // Attachments

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

    if (combined.length > maxFiles) {
      nextError = isGuest
        ? 'You can only attach one file per message.'
        : `Attach no more than ${MAX_FILES} files at once.`
      combined.length = maxFiles
    }

    const totalSize = combined.reduce(
      (sum, file) => sum + file.size,
      0,
    )

    if (totalSize > MAX_TOTAL_FILE_SIZE) {
      setError('Combined attachments cannot exceed 25 MB.')
    } else {
      setFiles(combined)
      setError(nextError)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, i) => i !== index),
    )

    setError('')
  }

  // Send a message to the backend

  async function sendMessage(
    event?: FormEvent<HTMLFormElement>,
    suggestedQuestion?: string,
  ) {
    event?.preventDefault()

    const question = (suggestedQuestion ?? input).trim()

    if (!question || isSending) return

    setError('')
    setInput('')
    setIsSending(true)

    const nextMessages: Message[] = [
      ...messages,
      {
        role: 'user',
        content: question,
      },
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

      if (response.status === 403 && isGuest) {
        setGuestLocked(true)
        setMessages(messages) // The question wasn't answered, so take it back out of the chat.
        void refreshUsage()
        return
      }
      
      if (!response.ok) {
        throw new Error(
          data.detail ||
            'The assistant could not answer. Please try again.',
        )
      }

      if (!data.reply) {
        throw new Error(
          'The assistant returned an empty response.',
        )
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.reply!,
          suggestions: Array.isArray(data.suggestions)
            ? data.suggestions
                .filter(
                  (item): item is string =>
                    typeof item === 'string' &&
                    item.trim().length > 0,
                )
                .slice(0, 3)
            : [],
        },
      ])
      void refreshUsage()

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

  // Download the current conversation

  function downloadTranscript() {
    // The first message is the widget's greeting or reset notice.
    const transcript = messages
      .slice(1)
      .map(({ role, content }) => {
        const speaker = role === 'user' ? 'You' : 'Study Companion'
        return `${speaker}:\n${content}`
      })
      .join('\n\n')

    const file = new Blob([transcript, '\n'], {
      type: 'text/plain;charset=utf-8',
    })

    const url = URL.createObjectURL(file)
    const link = document.createElement('a')

    link.href = url
    link.download = 'study-companion-transcript.txt'

    document.body.appendChild(link)
    link.click()
    link.remove()

    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Start a new chat

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
    chatInputRef.current?.focus()
  }

  return (
    <div className="chatbot-widget">
      <button
        ref={toggleButtonRef}
        type="button"
        className="chatbot-toggle"
        onClick={isOpen ? closeChat : openChat}
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
        aria-expanded={isOpen}
        aria-controls="study-chat-panel"
      >
        {isOpen ? (
          <span
            className="chatbot-close-icon"
            aria-hidden="true"
          >
            ×
          </span>
        ) : (
          <ChatIcon />
        )}
      </button>

      <div
        id="study-chat-panel"
        className="chatbot-window"
        hidden={!isOpen}
        style={{
          width: `min(${chatSize.width}px, calc(100vw - 32px))`,
          height: `min(${chatSize.height}px, calc(100dvh - ${
            window.innerWidth <= 768 ? 210 : 120
          }px))`,
        }}
      >
        <button
          type="button"
          className="chatbot-resize-handle"
          onPointerDown={startResize}
          onPointerMove={handleResize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
          tabIndex={-1}
          aria-hidden="true"
        >
          <span aria-hidden="true">⤢</span>
        </button>

        <section
          className="study-chat"
          aria-labelledby="study-chat-title"
        >
          <header className="study-chat__header">
            <div className="study-chat__header-info">
              <h2 id="study-chat-title">
                Study Companion Chat
              </h2>

              <p>
                Ask questions or get help with your study materials.
              </p>
            </div>

            <div className="study-chat__header-actions">
              <button
                type="button"
                className="study-chat__secondary-button"
                onClick={() => changeChatSize(-50)}
                aria-label="Make chat window smaller"
              >
                Smaller
              </button>

              <button
                type="button"
                className="study-chat__secondary-button"
                onClick={() => changeChatSize(50)}
                aria-label="Make chat window bigger"
              >
                Bigger
              </button>

              <button
                type="button"
                className="study-chat__secondary-button"
                onClick={startNewChat}
                disabled={isSending || locked}
              >
                New chat
              </button>

              <button
                type="button"
                className="study-chat__secondary-button"
                onClick={downloadTranscript}
                disabled={isSending || messages.length < 2}
              >
                Download transcript
              </button>
            </div>

            <span className="sr-only" role="status">
              {sizeAnnouncement}
            </span>
          </header>

          <div
            ref={messagesContainerRef}
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
                  {message.role === 'user'
                    ? 'You'
                    : 'Study Companion'}
                </span>

                <p>{message.content}</p>

                {message.role === 'assistant' &&
                  message.suggestions &&
                  message.suggestions.length > 0 && (
                    <div className="study-chat__suggestions">
                      <span className="study-chat__suggestions-title">
                        Suggested questions:
                      </span>

                      <div className="study-chat__suggestions-list">
                        {message.suggestions.map((suggestion, suggestionIndex) => (
                          <button
                            key={`${suggestionIndex}-${suggestion}`}
                            type="button"
                            className="study-chat__secondary-button study-chat__suggestion-button"
                            onClick={() => sendMessage(undefined, suggestion)}
                            disabled={isSending || locked}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </article>
            ))}

            {isSending && (
              <p
                className="study-chat__status"
                role="status"
              >
                Study Companion is thinking…
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {files.length > 0 && (
            <div
              className="study-chat__attachments"
              aria-label="Attached study materials"
            >
              <p className="study-chat__attachments-title">
                Study materials included with each message
              </p>

              <ul>
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                  >
                    <span>{file.name}</span>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={isSending || locked}
                      aria-label={`Remove ${file.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Guest Counter */}
          {isGuest && usage && !locked && (
            <p className = "study-chat__hint">
              Guest mode: {usage.chats_remaining ?? 0} free{' '}
              {usage.chats_remaining === 1 ? 'question' : 'questions'} left.
            </p>
          )}

          {/* Opens the either-or. When locked, show the sign-up notice instead of the form */}
          {locked ? (
            <GuestLimitNotice
            message="You've used your free guest questions. Create a free account to keep chatting."
            onSignUp={goToSignUp}
          />
            ) : (

          /* Message Input */
          <form
            className="study-chat__form"
            onSubmit={sendMessage}
          >
            <label htmlFor="study-chat-input">
              Your question
            </label>

            <textarea
              ref={chatInputRef}
              id="study-chat-input"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask a question or request an explanation…"
              rows={3}
              maxLength={4000}
              disabled={isSending || locked}
            />

            <div className="study-chat__actions">
              <div>
                <input
                  ref={fileInputRef}
                  id="study-chat-files"
                  className="study-chat__file-input"
                  type="file"
                  multiple={!isGuest}
                  accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif,.bmp,.gif,.tif,.tiff,.ico,.svg,.psd,.raw,.dng,.cr2,.nef,.arw"
                  onChange={(event) => 
                    addFiles(event.target.files)
                  }
                  disabled={
                    isSending || files.length >= maxFiles
                  }
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
                {isSending
                  ? 'Sending…'
                  : 'Send message'}
              </button>
            </div>

            <p className="study-chat__hint">
              You can ask general study questions or questions
              about attached files. Attachments are sent with
              each message until you remove them.
            </p>

            {error && (
              <p
                className="study-chat__error"
                role="alert"
              >
                {error}
              </p>
            )}
          </form>
          )} 
        </section>
      </div>
    </div>
  )
}