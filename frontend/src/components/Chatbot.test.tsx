import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Chatbot from './Chatbot'

const fetchMock = vi.fn()

function mockResponse(
  data: { reply?: string; detail?: string; suggestions?: unknown[] },
  ok = true,
) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
  }
}

function createFile(name = 'notes.txt') {
  return new File(['Sample study notes'], name, {
    type: 'text/plain',
  })
}

function renderChatbot() {
  const result = render(<Chatbot />)

  fireEvent.click(
    screen.getByRole('button', { name: 'Open AI chat' }),
  )

  return result
}

describe('Chatbot', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('renders the initial greeting and chat controls', () => {
    renderChatbot()

    expect(
      screen.getByRole('heading', { name: 'Study Companion Chat' }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(/Hi! I’m your Study Companion/),
    ).toBeInTheDocument()

    expect(screen.getByLabelText('Your question')).toBeInTheDocument()

    expect(
      screen.getByLabelText('Attach notes'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Send message' }),
    ).toBeDisabled()

    expect(
      screen.getByRole('button', { name: 'New chat' }),
    ).toBeEnabled()
  })

  test('sends a question and displays the assistant response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        reply: 'Photosynthesis converts light into chemical energy.',
      }),
    )

    renderChatbot()

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: '  What is photosynthesis?  ' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      await screen.findByText(
        'Photosynthesis converts light into chemical energy.',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText('What is photosynthesis?'),
    ).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8000/api/chat')
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')

    const formData = options.body as FormData

    expect(formData.get('message')).toBe('What is photosynthesis?')
    expect(
      JSON.parse(formData.get('history') as string),
    ).toHaveLength(1)
  })

  test('does not send a blank question', () => {
    renderChatbot()

    const form = screen.getByLabelText('Your question').closest('form')

    expect(form).not.toBeNull()

    fireEvent.submit(form!)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('downloads the current conversation as a text transcript', async () => {
    const createObjectURL = vi.fn<(file: Blob) => string>(
      () => 'blob:transcript',
    )
    const revokeObjectURL = vi.fn()

    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL
        static revokeObjectURL = revokeObjectURL
      },
    )

    const clickLink = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    fetchMock.mockResolvedValueOnce(
      mockResponse({ reply: 'Méthode\nExample' }),
    )

    renderChatbot()

    const downloadButton = screen.getByRole('button', {
      name: 'Download transcript',
    })

    expect(downloadButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'What is recursion?' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(downloadButton).toBeDisabled()

    await waitFor(() => {
      expect(downloadButton).toBeEnabled()
    })

    fireEvent.click(downloadButton)

    expect(clickLink).toHaveBeenCalledTimes(1)

    const link = clickLink.mock.contexts[0] as HTMLAnchorElement

    expect(link.download).toBe('study-companion-transcript.txt')
    expect(link.href).toBe('blob:transcript')
    expect(link.isConnected).toBe(false)

    const [[file]] = createObjectURL.mock.calls

    expect(file.type).toBe('text/plain;charset=utf-8')

    const transcript = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })

    expect(transcript).toBe(
      'You:\nWhat is recursion?\n\nStudy Companion:\nMéthode\nExample\n',
    )

    await waitFor(
      () => {
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:transcript')
      },
      { timeout: 2000 },
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'New chat' }),
    )

    expect(downloadButton).toBeDisabled()
  })

  test('shows an API error when the backend rejects a request', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        { detail: 'The AI assistant is not configured yet.' },
        false,
      ),
    )

    renderChatbot()

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Help me study.' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('The AI assistant is not configured yet.')
  })

  test('shows an error when the assistant returns an empty response', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ reply: '' }))

    renderChatbot()

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Explain gravity.' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('The assistant returned an empty response.')
  })

  test('shows a connection error when the request fails unexpectedly', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network unavailable'))

    renderChatbot()

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Explain gravity.' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Network unavailable')
  })

  test('shows a fallback error when the request rejects with a non-Error value', async () => {
    fetchMock.mockRejectedValueOnce('Unexpected failure')

    renderChatbot()

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Explain gravity.' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Unable to contact the assistant. Check your connection and try again.',
    )
  })

  test('allows a study file to be attached and removed', () => {
    renderChatbot()

    const file = createFile()

    fireEvent.change(screen.getByLabelText('Attach notes'), {
      target: { files: [file] },
    })

    expect(screen.getByText('notes.txt')).toBeInTheDocument()

    expect(
      screen.getByLabelText('Attached study materials'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove notes.txt' }),
    )

    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()

    expect(
      screen.queryByLabelText('Attached study materials'),
    ).not.toBeInTheDocument()
  })

  test('sends attached study materials with the question', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ reply: 'Your notes explain the water cycle.' }),
    )

    renderChatbot()

    const file = createFile('biology-notes.txt')

    fireEvent.change(screen.getByLabelText('Attach notes'), {
      target: { files: [file] },
    })

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Explain my notes.' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      await screen.findByText('Your notes explain the water cycle.'),
    ).toBeInTheDocument()

    const formData = fetchMock.mock.calls[0][1].body as FormData

    expect(formData.get('message')).toBe('Explain my notes.')
    expect(formData.get('files')).toBe(file)
  })

  test('rejects files larger than 25 MB', () => {
    renderChatbot()

    const oversizedFile = createFile('large-notes.txt')

    Object.defineProperty(oversizedFile, 'size', {
      value: 25 * 1024 * 1024 + 1,
    })

    fireEvent.change(screen.getByLabelText('Attach notes'), {
      target: { files: [oversizedFile] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '"large-notes.txt" exceeds the 25 MB file limit.',
    )

    expect(
      screen.queryByText('large-notes.txt'),
    ).not.toBeInTheDocument()
  })

  test('limits attachments to five files', () => {
    renderChatbot()

    const files = Array.from({ length: 6 }, (_, index) =>
      createFile(`notes-${index + 1}.txt`),
    )

    fireEvent.change(screen.getByLabelText('Attach notes'), {
      target: { files },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Attach no more than 5 files at once.',
    )

    for (let index = 1; index <= 5; index++) {
      expect(
        screen.getByText(`notes-${index}.txt`),
      ).toBeInTheDocument()
    }

    expect(screen.queryByText('notes-6.txt')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Attach notes')).toBeDisabled()
  })

  test('does not add the same file twice', () => {
    renderChatbot()

    const file = createFile()

    fireEvent.change(screen.getByLabelText('Attach notes'), {
      target: { files: [file, file] },
    })

    expect(screen.getAllByText('notes.txt')).toHaveLength(1)
  })

  test('starts a new chat and keeps attached study materials', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ reply: 'Here is your answer.' }),
    )

    renderChatbot()

    const file = createFile()

    fireEvent.change(screen.getByLabelText('Attach notes'), {
      target: { files: [file] },
    })

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'My previous question.' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      await screen.findByText('Here is your answer.'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'New chat' }),
    )

    expect(
      screen.getByText(/New chat started/),
    ).toBeInTheDocument()

    expect(
      screen.queryByText('My previous question.'),
    ).not.toBeInTheDocument()

    expect(screen.getByText('notes.txt')).toBeInTheDocument()
  })

  test('shows a sending state and disables controls while waiting for a response', async () => {
    let resolveRequest!: (value: unknown) => void

    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    renderChatbot()

    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'What is gravity?' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Send message' }),
    )

    expect(
      screen.getByText('Study Companion is thinking…'),
    ).toHaveTextContent('Study Companion is thinking…')

    expect(screen.getByLabelText('Your question')).toBeDisabled()
    expect(screen.getByLabelText('Attach notes')).toBeDisabled()

    expect(
      screen.getByRole('button', { name: 'Sending…' }),
    ).toBeDisabled()

    expect(
      screen.getByRole('button', { name: 'New chat' }),
    ).toBeDisabled()

    resolveRequest(
      mockResponse({ reply: 'Gravity is an attractive force.' }),
    )

    expect(
      await screen.findByText('Gravity is an attractive force.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).toBeDisabled()
    })
  })

  test('filters suggestions and sends a selected follow-up with conversation history', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({
        reply: 'Cells contain organelles.',
        suggestions: [null, ' ', 12, 'What is a mitochondrion?', 'What is ATP?', 'What is a nucleus?', 'Extra?'],
      }))
      .mockResolvedValueOnce(mockResponse({ reply: 'It produces ATP.' }))
    renderChatbot()
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Explain cells.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    const followUp = await screen.findByRole('button', { name: 'What is a mitochondrion?' })
    expect(screen.queryByRole('button', { name: 'Extra?' })).not.toBeInTheDocument()
    fireEvent.click(followUp)
    expect(await screen.findByText('It produces ATP.')).toBeInTheDocument()
    const body = fetchMock.mock.calls[1][1].body as FormData
    expect(body.get('message')).toBe('What is a mitochondrion?')
    expect(JSON.parse(body.get('history') as string)).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: 'Explain cells.' }),
      expect.objectContaining({ role: 'assistant', content: 'Cells contain organelles.' }),
    ]))
  })

  test('rejects combined attachments over 25 MB while preserving the previous selection', () => {
    renderChatbot()
    const first = createFile('first.txt')
    const second = createFile('second.txt')
    Object.defineProperty(first, 'size', { value: 15 * 1024 * 1024 })
    Object.defineProperty(second, 'size', { value: 15 * 1024 * 1024 })
    fireEvent.change(screen.getByLabelText('Attach notes'), { target: { files: [first] } })
    fireEvent.change(screen.getByLabelText('Attach notes'), { target: { files: [second] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Combined attachments cannot exceed 25 MB.')
    expect(screen.getByText('first.txt')).toBeInTheDocument()
    expect(screen.queryByText('second.txt')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('size buttons respect desktop and mobile viewport limits', () => {
    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('innerHeight', 900)
    const { container } = renderChatbot()
    const panel = container.querySelector('.chatbot-window') as HTMLElement
    fireEvent.click(screen.getByRole('button', { name: 'Make chat window bigger' }))
    expect(panel.style.width).toContain('500px')
    expect(panel.style.height).toContain('650px')
    fireEvent.click(screen.getByRole('button', { name: 'Make chat window smaller' }))
    expect(panel.style.width).toContain('450px')
    expect(screen.getByRole('status')).toHaveTextContent('450 by 600 pixels')
    vi.stubGlobal('innerWidth', 320)
    vi.stubGlobal('innerHeight', 640)
    act(() => window.dispatchEvent(new Event('resize')))
    expect(panel.style.width).toContain('288px')
    expect(panel.style.height).toContain('430px')
    fireEvent.click(screen.getByRole('button', { name: 'Make chat window bigger' }))
    expect(panel.style.width).toContain('288px')
    expect(panel.style.height).toContain('430px')
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Make chat window smaller' }))
    expect(panel.style.width).toContain('288px')
    expect(panel.style.height).toContain('300px')
  })

  test('dragging the resize handle changes size and stops when released', () => {
    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('innerHeight', 900)
    vi.stubGlobal('PointerEvent', MouseEvent)
    const { container } = renderChatbot()
    const handle = container.querySelector('.chatbot-resize-handle') as HTMLButtonElement
    const panel = container.querySelector('.chatbot-window') as HTMLElement
    handle.setPointerCapture = vi.fn()
    fireEvent.pointerMove(handle, { clientX: 200, clientY: 200 })
    expect(panel.style.width).toContain('450px')
    fireEvent.pointerDown(handle, { clientX: 300, clientY: 300, button: 0 })
    fireEvent.pointerMove(handle, { clientX: 250, clientY: 250 })
    expect(panel.style.width).toContain('500px')
    expect(panel.style.height).toContain('650px')
    fireEvent.pointerUp(handle)
    fireEvent.pointerMove(handle, { clientX: 100, clientY: 100 })
    expect(panel.style.width).toContain('500px')
    expect(screen.getByRole('status')).toHaveTextContent('Chat window size updated')
  })

  test('closing the chat returns focus to its launcher', () => {
    renderChatbot()
    expect(screen.getByLabelText('Your question')).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Close AI chat' }))
    expect(screen.getByRole('button', { name: 'Open AI chat' })).toHaveFocus()
    expect(screen.queryByLabelText('Your question')).not.toBeVisible()
  })
})
