import { expect, test } from '@playwright/test'
import { expectLoggedIn, loginAsGuest } from './helpers/auth.ts'

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

  test('shows recent sessions with a way to resume each one', async ({ page }) => {
    const sessions = page.locator('.home__sessions')
    await expect(sessions.getByRole('link')).not.toHaveCount(0)
    await expect(sessions.getByText('Resume').first()).toBeVisible()
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
