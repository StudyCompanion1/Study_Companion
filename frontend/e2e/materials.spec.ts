import { expect, test, type Page } from '@playwright/test'
import { loginAsGuest } from './helpers/auth.js'

async function createCollection(page: Page) {
  await page.getByRole('link', { name: 'Collections', exact: true }).click()
  await page.getByRole('button', { name: 'New collection' }).click()
  const dialog = page.getByRole('dialog', { name: 'New collection' })
  await dialog.getByLabel('Collection name').fill('Biology lab')
  await dialog.getByLabel('Course code (optional)').fill('BIO 201')
  await dialog.getByRole('button', { name: 'Create collection' }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('link', { name: /^Biology lab, BIO 201/ }).click()
  await expect(page.getByRole('heading', { name: 'Biology lab', exact: true })).toBeVisible()
}

async function uploadText(page: Page, name: string, text: string) {
  await page.getByLabel('Choose course material to upload').setInputFiles({
    name, mimeType: 'text/plain', buffer: Buffer.from(text),
  })
  await expect(page.getByText('Upload complete', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: name.replace(/\.txt$/, ''), exact: true })).toBeVisible()
}

test('creates a collection, uploads and previews a file, and keeps notes after reload', async ({ page }) => {
  await loginAsGuest(page)
  await createCollection(page)
  await uploadText(page, 'Cell structure.txt', 'Mitochondria produce ATP. The nucleus stores DNA.')
  await page.getByRole('link', { name: 'Cell structure', exact: true }).click()
  await expect(page.getByText('Mitochondria produce ATP. The nucleus stores DNA.', { exact: true })).toBeVisible()
  const note = page.getByLabel('Notes page 1', { exact: true })
  // Blur flushes immediately; waiting for the response makes the reload deterministic.
  const saved = page.waitForResponse(response => response.url().endsWith('/notes/1') && response.request().method() === 'PUT')
  await note.fill('Remember: mitochondria produce ATP.')
  await page.getByRole('heading', { name: 'Cell structure', exact: true }).click()
  expect((await saved).ok()).toBe(true)
  await page.reload()
  await expect(page.getByLabel('Notes page 1', { exact: true })).toHaveValue('Remember: mitochondria produce ATP.')
  await page.getByRole('button', { name: 'Add notes page' }).click()
  await expect(page.getByLabel('Notes page 2', { exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Remove notes page 2' }).click()
  await expect(page.getByLabel('Notes page 2', { exact: true })).toHaveCount(0)
})

test('saves a custom material order and disables reordering during search', async ({ page }) => {
  await loginAsGuest(page)
  await createCollection(page)
  await uploadText(page, 'First lecture.txt', 'First lecture notes')
  await uploadText(page, 'Second lecture.txt', 'Second lecture notes')
  const rows = page.locator('.note-row__link')
  // Reload first so the initial order is the persisted server order.
  await page.reload()
  await expect(rows).toHaveCount(2)
  const original = await rows.allTextContents()
  const save = page.waitForResponse(response => response.url().includes('/materials/order') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: `Move ${original[1]} up`, exact: true }).click()
  expect((await save).ok()).toBe(true)
  await expect(rows).toHaveText([original[1], original[0]])
  await page.reload()
  await expect(rows).toHaveText([original[1], original[0]])
  await page.getByRole('searchbox', { name: 'Search this collection' }).fill('First lecture')
  await expect(rows).toHaveText(['First lecture'])
  await expect(page.getByRole('button', { name: /^Move / })).toHaveCount(0)
})

test('rejects an unsupported upload without adding a material', async ({ page }) => {
  await loginAsGuest(page)
  await createCollection(page)
  await page.getByLabel('Choose course material to upload').setInputFiles({
    name: 'program.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('unsupported'),
  })
  await expect(page.getByRole('alert')).toContainText('Upload failed')
  await expect(page.locator('.note-row__link')).toHaveCount(0)
})
