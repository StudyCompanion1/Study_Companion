import { expect, test } from '@playwright/test'
import { loginAsGuest } from './helpers/auth.js'

// Browser workflow tests stub the AI endpoint: no provider keys, cost, or nondeterministic answers.
// Real backend attachment and response handling are covered in test_chatbot_behavior.py.
test('sends attachments, follows suggested questions, and starts a new conversation', async ({ page }) => {
  const bodies: string[] = []
  await page.route('**/api/chat', async route => {
    bodies.push(route.request().postDataBuffer()?.toString() ?? '')
    await route.fulfill({ json: bodies.length === 1
      ? { reply: 'Mitochondria produce ATP.', suggestions: ['What is ATP?'] }
      : { reply: 'ATP stores usable energy.', suggestions: [] } })
  })
  await loginAsGuest(page)
  await page.getByRole('button', { name: 'Open AI chat' }).click()
  await page.getByLabel('Attach notes').setInputFiles({
    name: 'biology.txt', mimeType: 'text/plain', buffer: Buffer.from('Cell biology notes'),
  })
  await page.getByLabel('Your question').fill('Explain these notes.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Mitochondria produce ATP.', { exact: true })).toBeVisible()
  expect(bodies[0]).toContain('Explain these notes.')
  expect(bodies[0]).toContain('Cell biology notes')
  await page.getByRole('button', { name: 'What is ATP?', exact: true }).click()
  await expect(page.getByText('ATP stores usable energy.', { exact: true })).toBeVisible()
  expect(bodies[1]).toContain('What is ATP?')
  expect(bodies[1]).toContain('Mitochondria produce ATP.')
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await expect(page.getByRole('log', { name: 'Chat messages' })).not.toContainText('ATP stores usable energy.')
  await expect(page.getByText('biology.txt', { exact: true })).toBeVisible()
})

test('shows a failed AI request and recovers on a later question', async ({ page }) => {
  let requests = 0
  await page.route('**/api/chat', async route => {
    requests++
    await route.fulfill(requests === 1
      ? { status: 503, json: { detail: 'The AI assistant is not configured yet.' } }
      : { json: { reply: 'The assistant is available again.' } })
  })
  await loginAsGuest(page)
  await page.getByRole('button', { name: 'Open AI chat' }).click()
  await page.getByLabel('Your question').fill('Explain cells.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('alert')).toHaveText('The AI assistant is not configured yet.')
  await page.getByLabel('Your question').fill('Try explaining cells again.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('The assistant is available again.', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
