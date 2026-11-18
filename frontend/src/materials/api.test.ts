import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../auth/api.ts'
import { checkFile, listMaterials, MAX_UPLOAD_BYTES, reorderMaterials, uploadMaterial } from './api.ts'

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function fileOf(name: string, size = 10) {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const material = { id: '1', collection_id: 'c1', title: 'Week 1', file_type: 'pdf', created_at: '2026-11-12T00:00:00Z' }

describe('checkFile', () => {
  test('accepts supported files, whatever the letter case', () => {
    expect(checkFile(fileOf('Week 1.pdf'))).toBeNull()
    expect(checkFile(fileOf('slides.PPTX'))).toBeNull()
    expect(checkFile(fileOf('photo.jpeg'))).toBeNull()
  })

  test('rejects unsupported or missing extensions', () => {
    expect(checkFile(fileOf('setup.exe'))).toMatch(/isn’t supported/)
    expect(checkFile(fileOf('README'))).toMatch(/isn’t supported/)
  })

  test('rejects empty and oversized files', () => {
    expect(checkFile(fileOf('a.pdf', 0))).toBe('This file is empty.')
    expect(checkFile(fileOf('a.pdf', MAX_UPLOAD_BYTES + 1))).toBe('File exceeds the 25 MB upload limit.')
    expect(checkFile(fileOf('a.pdf', MAX_UPLOAD_BYTES))).toBeNull()
  })
})

describe('uploadMaterial', () => {
  test('posts the file as form data and returns the saved material', async () => {
    const fetchMock = mockFetch(201, material)
    const file = fileOf('Week 1.pdf')

    await expect(uploadMaterial(file)).resolves.toEqual(material)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/materials')
    expect(init.method).toBe('POST')
    const body = init.body as FormData
    expect(body.get('file')).toBe(file)
    expect(body.has('collection_id')).toBe(false)
    expect(init.headers).toBeUndefined() // the browser must set the multipart Content-Type
  })

  test('sends the collection when given one', async () => {
    const fetchMock = mockFetch(201, material)

    await uploadMaterial(fileOf('a.pdf'), 'c1')

    expect((fetchMock.mock.calls[0][1].body as FormData).get('collection_id')).toBe('c1')
  })

  test('throws the backend message on failure', async () => {
    mockFetch(413, { detail: 'File exceeds the 25 MB upload limit.' })

    const error = await uploadMaterial(fileOf('a.pdf')).catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(413)
    expect((error as ApiError).message).toBe('File exceeds the 25 MB upload limit.')
  })

  test('falls back to a generic message when the error has no JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })))

    await expect(uploadMaterial(fileOf('a.pdf'))).rejects.toThrow('Something went wrong. Please try again.')
  })
})

describe('listMaterials', () => {
  test('returns all the student’s materials', async () => {
    const fetchMock = mockFetch(200, [material])

    await expect(listMaterials()).resolves.toEqual([material])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/materials')
  })

  test('returns one collection’s materials', async () => {
    const fetchMock = mockFetch(200, [material])

    await listMaterials('c 1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/materials?collection_id=c%201')
  })
})

describe('reorderMaterials', () => {
  test('sends the whole new order', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await reorderMaterials('c1', ['b', 'a'])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/materials/order')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ collection_id: 'c1', material_ids: ['b', 'a'] })
  })

  test('throws the backend message on failure', async () => {
    mockFetch(409, { detail: 'This list of files is out of date.' })

    await expect(reorderMaterials('c1', [])).rejects.toThrow('This list of files is out of date.')
  })
})
