import { expect, test } from '@playwright/test'
import { loginAsGuest, signUp } from './helpers/auth.ts'
import { collectionCard, createCollection, newCollectionDialog, openCollections } from './helpers/collections.ts'

/*
 * Collections tests (Test Case Tracker: TC-100 to TC-103, "Create and Name a Collection").
 * Uploading files and notes inside a collection is covered in materials.spec.ts.
 * Every test starts as a brand-new user, so it begins with no collections.
 */

test.describe('Collections page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page)
    await openCollections(page)
  })

  test('a new user sees an empty page with a way to create a collection', async ({ page }) => {
    await expect(page.getByText(/No collections yet/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'New collection' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Collections', exact: true }))
      .toHaveAttribute('aria-current', 'page')
  })

  test('creating a collection shows its card, grouped under its term (TC-100, TC-101)', async ({ page }) => {
    await createCollection(page, { name: 'Cell biology', code: 'BIO 201', term: 'Spring 2027' })

    const card = collectionCard(page, 'Cell biology')
    await expect(card).toContainText('BIO 201')
    await expect(page.getByRole('heading', { level: 2, name: 'Spring 2027' })).toBeVisible()
    await expect(page.getByText('1 collection · 0 notes')).toBeVisible()
    await expect(page.getByText(/No collections yet/)).toHaveCount(0)
  })

  test('only the name is required; a collection without a term goes under "No term"', async ({ page }) => {
    await createCollection(page, { name: 'Reading list' })

    await expect(page.getByRole('heading', { level: 2, name: 'No term' })).toBeVisible()
    await expect(collectionCard(page, 'Reading list')).toBeVisible()
  })

  test('an empty or blank name is refused with a clear message (TC-103)', async ({ page }) => {
    await page.getByRole('button', { name: 'New collection' }).click()
    const dialog = newCollectionDialog(page)
    const name = dialog.getByLabel('Collection name')

    await dialog.getByRole('button', { name: 'Create collection' }).click()
    await expect(dialog.getByText('Enter a collection name.')).toBeVisible()
    await expect(name).toBeFocused()

    await name.fill('    ')
    await dialog.getByRole('button', { name: 'Create collection' }).click()
    await expect(dialog.getByText('Enter a collection name.')).toBeVisible()
    await expect(dialog).toBeVisible()

    // Typing clears the message
    await name.fill('Chemistry')
    await expect(dialog.getByText('Enter a collection name.')).toHaveCount(0)
  })

  test('Cancel and Escape close the dialog without creating anything', async ({ page }) => {
    const dialog = newCollectionDialog(page)

    await page.getByRole('button', { name: 'New collection' }).click()
    await dialog.getByLabel('Collection name').fill('Not saved')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'New collection' }).click()
    await expect(dialog.getByLabel('Collection name')).toHaveValue('') // the form starts fresh
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await expect(collectionCard(page, 'Not saved')).toHaveCount(0)
    await expect(page.getByText(/No collections yet/)).toBeVisible()
  })

  test('a collection can be created with the keyboard only', async ({ page }) => {
    await page.getByRole('button', { name: 'New collection' }).focus()
    await page.keyboard.press('Enter')

    const dialog = newCollectionDialog(page)
    await expect(dialog.getByLabel('Collection name')).toBeFocused() // focus moves into the dialog
    await page.keyboard.type('History essays')
    await page.keyboard.press('Enter') // submits the form

    await expect(dialog).toBeHidden()
    await expect(collectionCard(page, 'History essays')).toBeVisible()
  })

  test('collections are still there after a reload, newest first (TC-102)', async ({ page }) => {
    await createCollection(page, { name: 'First collection', term: 'Spring 2027' })
    await createCollection(page, { name: 'Second collection', term: 'Spring 2027' })

    await page.reload()
    await expect(page.getByText('Loading collections…')).toHaveCount(0)

    const cards = page.getByRole('link', { name: /^(First|Second) collection/ })
    await expect(cards).toHaveCount(2)
    await expect(cards.first()).toHaveAccessibleName(/^Second collection/)
    await expect(page.getByText('2 collections · 0 notes')).toBeVisible()
  })
})

test.describe('Inside a collection', () => {
  test('a card opens its collection, and the breadcrumb leads back', async ({ page }) => {
    await loginAsGuest(page)
    await openCollections(page)
    await createCollection(page, { name: 'Cell biology', code: 'BIO 201', term: 'Spring 2027' })

    await collectionCard(page, 'Cell biology').click()

    await expect(page).toHaveURL(/\/collections\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Cell biology' })).toBeVisible()
    await expect(page.getByText('BIO 201 · Spring 2027 · 0 notes')).toBeVisible()
    await expect(page.getByText('No notes yet. Upload slides, a PDF or a document to start.')).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Upload material' })).toBeVisible()

    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(breadcrumb.getByText('Cell biology')).toHaveAttribute('aria-current', 'page')
    await breadcrumb.getByRole('link', { name: 'Collections' }).click()
    await expect(page).toHaveURL(/\/collections$/)
    await expect(collectionCard(page, 'Cell biology')).toBeVisible()
  })

  test('an address that is not a collection shows a way back', async ({ page }) => {
    await loginAsGuest(page)

    for (const address of ['/collections/banana', '/collections/00000000-0000-4000-8000-000000000000']) {
      await page.goto(address)
      await expect(page.getByRole('heading', { level: 1, name: 'We couldn’t find that collection' })).toBeVisible()
    }

    await page.getByRole('link', { name: 'Back to Collections' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeVisible()
  })
})

test.describe('Privacy', () => {
  test('one user cannot see or open another user’s collection', async ({ page, context }) => {
    await signUp(page)
    await openCollections(page)
    await createCollection(page, { name: 'Private notes' })
    await collectionCard(page, 'Private notes').click()
    const privateAddress = new URL(page.url()).pathname

    // A different person logs in on the same browser
    await context.clearCookies()
    await signUp(page)
    await openCollections(page)
    await expect(page.getByText(/No collections yet/)).toBeVisible()
    await expect(collectionCard(page, 'Private notes')).toHaveCount(0)

    await page.goto(privateAddress)
    await expect(page.getByRole('heading', { level: 1, name: 'We couldn’t find that collection' })).toBeVisible()
  })
})
