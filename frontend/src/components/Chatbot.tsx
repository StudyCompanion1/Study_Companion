
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from 'react'
import './Chatbot.css'

//types

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatResponse = {
  reply?: string
  detail?: string
}

type ChatSize = {
  width: number
  height: number
}

//constants

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const MAX_FILES = 5
const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_TOTAL_FILE_SIZE = 25 * 1024 * 1024

const DEFAULT_CHAT_SIZE: ChatSize = {
  width: 450,
  height: 600,
}

//chatbot icon

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

//helper functions 

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

//main chatbot components 

export default function Chatbot() {

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

  // Focus the input when the chat opens.
  useEffect(() => {
    if (isOpen) {
      chatInputRef.current?.focus()
    }
  }, [isOpen])

 //chat resize 

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

  // Keyboard-accessible resizing through buttons.
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

  // Start resizing from the top-left corner.
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

  // Resize the entire chat window.
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

  // Keep the window inside the screen if resized.
  useEffect(() => {
    function handleWindowResize() {
      setChatSize((current) => constrainSize(current))
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])

  //chat msg 

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

  // Scroll only the message area, not the dashboard.
  useEffect(() => {
    const container = messagesContainerRef.current

    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, isSending])

//file attached 
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

  //send msg to gemini backend 

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const question = input.trim()

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
        },
      ])
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

  //start new chat

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

 //render chatbot window 

  return (
    <div className="chatbot-widget">

      {/* Floating Chat Button */}
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

      {/* Floating Resizable Chat Window */}
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

        {/* Top-left Resize Handle */}
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

          {/* Chat Header */}
          <header className="study-chat__header">

            <div className="study-chat__header-info">
              <h2 id="study-chat-title">
                Study Companion Chat
              </h2>

              <p>
                Ask questions or get help with your study materials.
              </p>
            </div>

            {/* Accessible Window Controls */}
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
                disabled={isSending}
              >
                New chat
              </button>
            </div>

            <span className="sr-only" role="status">
              {sizeAnnouncement}
            </span>

          </header>

          {/* Chat Messages */}
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

          {/* Attached Study Materials */}
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

          {/* Message Input */}
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
              disabled={isSending}
            />

            <div className="study-chat__actions">

              {/* Attach Notes */}
              <div>
                <input
                  ref={fileInputRef}
                  id="study-chat-files"
                  className="study-chat__file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif,.bmp,.gif,.tif,.tiff,.ico,.svg,.psd,.raw,.dng,.cr2,.nef,.arw"
                  onChange={(event) =>
                    addFiles(event.target.files)
                  }
                  disabled={
                    isSending || files.length >= MAX_FILES
                  }
                />

                <label
                  className="study-chat__attach-button"
                  htmlFor="study-chat-files"
                >
                  Attach notes
                </label>
              </div>

              {/* Send Message */}
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

        </section>
      </div>
    </div>
  )
}
