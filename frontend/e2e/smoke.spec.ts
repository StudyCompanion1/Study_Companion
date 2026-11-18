import { expect, test } from '@playwright/test'
import { expectLoggedIn, login, loginAsGuest, signUp } from './helpers/auth.ts'
import { useTheme } from './helpers/theme.ts'

/* Smoke tests: quick proof that the app, the backend and the test setup all work together. */

test('the login page loads', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Study Companion/)
  await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guest login' })).toBeVisible()
})

test('a guest can get into the app', async ({ page }) => {
  await loginAsGuest(page)

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('a new user can sign up, and log back in later', async ({ page, context }) => {
  const user = await signUp(page)

  // Forget the session (like closing the browser), then log in again
  await context.clearCookies()
  await login(page, user)
  await expectLoggedIn(page)
})

test('the chosen theme is applied', async ({ page }) => {
  await useTheme(page, 'high-contrast')
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
})
