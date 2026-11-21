import { expect, test } from '@playwright/test'
import { expectLoggedIn, loginAsGuest } from './helpers/auth.ts'
import { collectionCard, createCollection, openCollections } from './helpers/collections.ts'

/*
 * Home page tests (Test Case Tracker: TC-013 Home works, TC-014 navigation, TC-016 Home shows its features).
 * Home still shows sample data, so these check the layout and navigation, not real study data.
 */

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page)
})

test.describe('Home page (TC-013, TC-016)', () => {
  test('shows one page heading and its three sections', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 2, name: 'Pick up where you left off' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Needs more practice' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Recent quizzes' })).toBeVisible()
  })

  // "Pick up where you left off" shows the user's real collections (since PR #45), not sample sessions
  test('a new user is told they have no collections yet', async ({ page }) => {
    await expect(page.getByText('No collections yet. Create one to get started.')).toBeVisible()
  })

  test('shows up to 3 of the most recent collections, each opening the collection', async ({ page }) => {
    await openCollections(page)
    for (const name of ['Biology', 'Chemistry', 'History', 'Psychology']) {
      await createCollection(page, { name })
    }
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Home', exact: true }).click()

    const recent = page.locator('.home__sessions').getByRole('link')
    await expect(recent).toHaveCount(3)
    await expect(collectionCard(page, 'Psychology')).toBeVisible()
    await expect(collectionCard(page, 'Biology')).toHaveCount(0) // the oldest one is left out

    await collectionCard(page, 'Psychology').click()
    await expect(page.getByRole('heading', { level: 1, name: 'Psychology' })).toBeVisible()
  })

  test('every practice button says which topic it practises', async ({ page }) => {
    // Screen reader users hear "Practice Mitochondria and ATP", not just "Practice" three times
    const practice = page.getByRole('button', { name: /^Practice .+/ })
    await expect(practice).not.toHaveCount(0)
    for (const button of await practice.all()) {
      await expect(button).toHaveAccessibleName(/^Practice \S/)
    }
  })

  test('has an Upload material button', async ({ page }) => {
    await expect(page.locator('main').getByRole('button', { name: 'Upload material' })).toBeEnabled()
  })

  test('has a button to open the AI chat', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Open AI chat' })).toBeVisible()
  })
})

test.describe('Navigation (TC-014)', () => {
  test('the menu has a name and marks Home as the current page', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Primary' })

    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Collections' })).not.toHaveAttribute('aria-current', 'page')
  })

  test('Collections opens the Collections page and becomes the current page', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Primary' })
    await nav.getByRole('link', { name: 'Collections' }).click()

    await expect(page).toHaveURL(/\/collections$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Collections' })).toHaveAttribute('aria-current', 'page')
  })

  test('Home takes you back from Collections', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Primary' })
    await nav.getByRole('link', { name: 'Collections' }).click()
    await expect(page).toHaveURL(/\/collections$/)

    await nav.getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  test('the browser Back button works between pages', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Collections' }).click()
    await expect(page).toHaveURL(/\/collections$/)

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expectLoggedIn(page)
  })

  test('an unknown address falls back to Home instead of a blank page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    await expectLoggedIn(page)
    await expect(page.getByRole('heading', { level: 2, name: 'Pick up where you left off' })).toBeVisible()
  })

  test('Settings and Accessibility are reachable from the menu', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accessibility', exact: true })).toBeVisible()
  })
})
