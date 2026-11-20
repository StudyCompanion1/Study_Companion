// Code inside page.evaluate() runs in the browser, so this file needs the browser (DOM) types.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { loginAsGuest, signUp } from './helpers/auth.ts'

/*
 * Settings and Accessibility panel tests (Test Case Tracker: TC-017 text size changes are visible).
 * The panels open from the left menu once logged in, and Accessibility also opens from the login page.
 */

/** The page's root font size in px. The text size slider scales it (1rem = 16px × scale). */
async function rootFontSize(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
}

function panel(page: Page, name: 'Settings' | 'Accessibility') {
  return page.getByRole('complementary', { name })
}

test.describe('Settings panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page)
  })

  test('opens and closes from the menu', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Settings', exact: true })
    await expect(button).toHaveAttribute('aria-expanded', 'false')

    await button.click()
    await expect(panel(page, 'Settings')).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')

    await page.getByRole('button', { name: 'Close settings' }).click()
    await expect(panel(page, 'Settings')).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  test('clicking the menu button again also closes it', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Settings', exact: true })
    await button.click()
    await expect(panel(page, 'Settings')).toBeVisible()

    await button.click()
    await expect(panel(page, 'Settings')).toBeHidden()
  })

  test('opening Accessibility replaces Settings (only one panel at a time)', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()

    await expect(panel(page, 'Accessibility')).toBeVisible()
    await expect(panel(page, 'Settings')).toBeHidden()
  })

  test('theme buttons switch the theme and show which one is on', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = panel(page, 'Settings')

    await settings.getByRole('button', { name: 'High contrast' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
    await expect(settings.getByRole('button', { name: 'High contrast' })).toHaveAttribute('aria-pressed', 'true')
    await expect(settings.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false')

    await settings.getByRole('button', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('the chosen theme is remembered after a refresh', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await panel(page, 'Settings').getByRole('button', { name: 'Dark' }).click()

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('Log out ends the session', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await panel(page, 'Settings').getByRole('button', { name: 'Log out' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()
  })
})

test.describe('Text size (TC-017)', () => {
  test('the slider makes text bigger and smaller', async ({ page }) => {
    await loginAsGuest(page)
    const before = await rootFontSize(page)

    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()
    const slider = panel(page, 'Accessibility').getByRole('slider', { name: 'Text size' })
    await expect(slider).toHaveAttribute('aria-valuetext', '100 percent')

    await slider.fill('1.5')
    await expect(slider).toHaveAttribute('aria-valuetext', '150 percent')
    expect(await rootFontSize(page)).toBeCloseTo(before * 1.5)

    await slider.fill('0.75')
    expect(await rootFontSize(page)).toBeCloseTo(before * 0.75)
  })

  test('the slider works with the arrow keys', async ({ page }) => {
    await loginAsGuest(page)
    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()
    const slider = panel(page, 'Accessibility').getByRole('slider', { name: 'Text size' })

    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveAttribute('aria-valuetext', '113 percent') // 1.125 → shown as 113%
  })

  test('bigger text does not make the page scroll sideways', async ({ page }) => {
    await loginAsGuest(page)
    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()
    await panel(page, 'Accessibility').getByRole('slider', { name: 'Text size' }).fill('2')
    await page.getByRole('button', { name: 'Close accessibility' }).click()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('text size can be changed on the login page too', async ({ page }) => {
    await page.goto('/')
    const before = await rootFontSize(page)

    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()
    await panel(page, 'Accessibility').getByRole('slider', { name: 'Text size' }).fill('1.25')

    expect(await rootFontSize(page)).toBeCloseTo(before * 1.25)
  })

  // Known gap: text size lives only in memory (useState in NavRail and AuthForm), so it resets.
  // Remove .fixme once the app saves the setting (for example in localStorage, like the theme).
  test.fixme('text size is remembered after a refresh', async ({ page }) => {
    await signUp(page)
    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()
    await panel(page, 'Accessibility').getByRole('slider', { name: 'Text size' }).fill('1.5')
    const enlarged = await rootFontSize(page)

    await page.reload()
    expect(await rootFontSize(page)).toBeCloseTo(enlarged)
  })

  test.fixme('text size chosen on the login page carries over after logging in', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()
    await panel(page, 'Accessibility').getByRole('slider', { name: 'Text size' }).fill('1.5')
    const enlarged = await rootFontSize(page)

    await page.getByRole('button', { name: 'Close accessibility' }).click()
    await page.getByRole('button', { name: 'Guest login' }).click()
    await expect(page.getByRole('link', { name: 'Collections' })).toBeVisible()
    expect(await rootFontSize(page)).toBeCloseTo(enlarged)
  })
})
