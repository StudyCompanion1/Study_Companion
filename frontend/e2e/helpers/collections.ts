import { expect, type Page } from '@playwright/test'

/* Collections helpers. Each one starts and ends on a screen a person would see. */

export interface NewCollection {
  name: string
  code?: string
  term?: string
}

/** Opens Collections from the left menu and waits for the page to finish loading. */
export async function openCollections(page: Page) {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Collections', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeVisible()
  await expect(page.getByText('Loading collections…')).toHaveCount(0)
}

/** The "New collection" dialog. */
export function newCollectionDialog(page: Page) {
  return page.getByRole('dialog', { name: 'New collection' })
}

/** Creates a collection through the dialog and waits for its card. Call from the Collections page. */
export async function createCollection(page: Page, collection: NewCollection) {
  await page.getByRole('button', { name: 'New collection' }).click()
  const dialog = newCollectionDialog(page)
  await dialog.getByLabel('Collection name').fill(collection.name)
  if (collection.code) await dialog.getByLabel('Course code (optional)').fill(collection.code)
  if (collection.term) await dialog.getByLabel('Term (optional)').fill(collection.term)
  await dialog.getByRole('button', { name: 'Create collection' }).click()
  await expect(dialog).toBeHidden()
  await expect(collectionCard(page, collection.name)).toBeVisible()
}

/** A collection's card. Its accessible name starts with the collection's name. */
export function collectionCard(page: Page, name: string) {
  return page.getByRole('link', { name: new RegExp(`^${escapeRegExp(name)}(,|$)`) })
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
