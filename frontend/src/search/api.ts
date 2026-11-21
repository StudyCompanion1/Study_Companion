import { ApiError } from '../auth/api'
import type { WebResource } from '../components/ResourceRow'

/** Backend (ground_brave_search) returns "title\nurl" blocks separated by blank lines, not JSON. */
function parseResults(raw: string): WebResource[] {
  return raw
    .split('\n\n')
    .map((block) => block.split('\n'))
    .filter((lines): lines is [string, string] => lines.length === 2 && lines[0] !== '' && lines[1] !== '')
    .map(([title, url]) => ({ title, url, source: hostnameOf(url) }))
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export async function searchResources(topic: string, signal?: AbortSignal): Promise<WebResource[]> {
  const response = await fetch(`/api/url-resources?query=${encodeURIComponent(topic)}`, { method: 'POST', cache: 'no-store', signal })
  if (!response.ok) throw new ApiError(response.status, 'The search request failed.')
  return parseResults(await response.json())
}
