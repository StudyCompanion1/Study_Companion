import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Chatbot from './Chatbot'

const fetchMock = vi.fn()

function mockResponse(
  data: { reply?: string; detail?: string },
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

    expect(screen.getByText('What is photosynthesis?')).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8000/api/chat')
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')

    const formData = options.body as FormData

    expect(formData.get('message')).toBe('What is photosynthesis?')
    expect(JSON.parse(formData.get('history') as string)).toHaveLength(1)
  })

  test('does not send a blank question', () => {
    renderChatbot()

    const form = screen.getByLabelText('Your question').closest('form')

    expect(form).not.toBeNull()

    fireEvent.submit(form!)

    expect(fetchMock).not.toHaveBeenCalled()
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

    expect(screen.queryByText('large-notes.txt')).not.toBeInTheDocument()
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
      screen.getByText('Study Companion is thinking…')
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
})
