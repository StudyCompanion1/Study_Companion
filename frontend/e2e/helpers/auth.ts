import { expect, type Page } from '@playwright/test'

/*
 * Login helpers shared by every E2E test.
 * Each one finishes on the Home page, so tests can start from a logged-in state.
 */

export interface TestUser {
  name: string
  email: string
  password: string
}

/** A brand-new user each call, so tests never share (or clash over) an account. */
export function newTestUser(): TestUser {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { name: `Test User ${id}`, email: `e2e-${id}@example.com`, password: 'correct-horse-battery' }
}

/** Waits until the logged-in app (the NavRail) is showing. */
export async function expectLoggedIn(page: Page) {
  await expect(page.getByRole('link', { name: 'Collections' })).toBeVisible()
}

export async function loginAsGuest(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Guest login' }).click()
  await expectLoggedIn(page)
}

/** Creates an account through the Sign up form and returns its details. */
export async function signUp(page: Page, user: TestUser = newTestUser()): Promise<TestUser> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.getByLabel('Name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Create password').fill(user.password)
  await page.getByRole('button', { name: 'Sign up', exact: true }).last().click()
  await expectLoggedIn(page)
  return user
}

export async function login(page: Page, user: Pick<TestUser, 'email' | 'password'>) {
  await page.goto('/')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expectLoggedIn(page)
}
