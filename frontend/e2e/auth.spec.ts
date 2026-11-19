import { expect, test, type Page } from '@playwright/test'
import { expectLoggedIn, login, loginAsGuest, newTestUser, signUp } from './helpers/auth.ts'

/*
 * Login and account tests (Test Case Tracker: TC-003 log in, TC-004 sign up, TC-006 guest login).
 * Every test makes its own user, so they can run in any order and side by side.
 */

/** Opens the Sign up form from the login page. */
async function openSignUp(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sign up' })).toBeVisible()
}

/** The Sign up form's submit button (the page also has a "Sign up" heading). */
function signUpSubmit(page: Page) {
  return page.locator('form').getByRole('button', { name: 'Sign up' })
}

function loginSubmit(page: Page) {
  return page.locator('form').getByRole('button', { name: 'Login', exact: true })
}

test.describe('Sign up (TC-004)', () => {
  test('a new user can create an account', async ({ page }) => {
    await signUp(page)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows a message for every empty field', async ({ page }) => {
    await openSignUp(page)
    await signUpSubmit(page).click()

    await expect(page.getByText('Enter your name.')).toBeVisible()
    await expect(page.getByText('Enter your email address.')).toBeVisible()
    await expect(page.getByText('Create a password.')).toBeVisible()
    // Focus jumps to the first field with a problem, so keyboard users land right on it
    await expect(page.getByLabel('Name')).toBeFocused()
  })

  test('rejects an incomplete email address', async ({ page }) => {
    await openSignUp(page)
    await page.getByLabel('Name').fill('Test User')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Create password').fill('correct-horse-battery')
    await signUpSubmit(page).click()

    await expect(page.getByText('That email address looks incomplete. Check it and try again.')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeFocused()
  })

  test('rejects a password shorter than 8 characters', async ({ page }) => {
    await openSignUp(page)
    await page.getByLabel('Name').fill('Test User')
    await page.getByLabel('Email').fill(newTestUser().email)
    await page.getByLabel('Create password').fill('short')
    await signUpSubmit(page).click()

    await expect(page.getByText('Use at least 8 characters for your password.')).toBeVisible()
  })

  test('will not create a second account with the same email', async ({ page, context }) => {
    const user = await signUp(page)
    await context.clearCookies()

    await openSignUp(page)
    await page.getByLabel('Name').fill('Someone Else')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Create password').fill('another-long-password')
    await signUpSubmit(page).click()

    await expect(page.getByText('An account with this email already exists.')).toBeVisible()
  })

  test('can switch back to the login form', async ({ page }) => {
    await openSignUp(page)
    await page.getByRole('button', { name: 'Login', exact: true }).last().click()

    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveCount(0)
  })
})

test.describe('Log in (TC-003)', () => {
  test('a registered user can log in', async ({ page, context }) => {
    const user = await signUp(page)
    await context.clearCookies()

    await login(page, user)
  })

  test('a wrong password shows an error and stays on the login page', async ({ page, context }) => {
    const user = await signUp(page)
    await context.clearCookies()

    await page.goto('/')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('definitely-the-wrong-password')
    await loginSubmit(page).click()

    await expect(page.getByText('We couldn’t log you in. Check your email and password and try again.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()
  })

  test('an email with no account cannot log in', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(newTestUser().email)
    await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery')
    await loginSubmit(page).click()

    await expect(page.getByText('We couldn’t log you in. Check your email and password and try again.')).toBeVisible()
  })

  test('empty fields are caught before anything is sent', async ({ page }) => {
    await page.goto('/')
    await loginSubmit(page).click()

    await expect(page.getByText('Enter your email address.')).toBeVisible()
    await expect(page.getByText('Enter your password.')).toBeVisible()
  })

  test('the password can be shown and hidden', async ({ page }) => {
    await page.goto('/')
    const password = page.getByLabel('Password', { exact: true })
    await password.fill('secret-words')
    await expect(password).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(password).toHaveAttribute('type', 'text')

    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(password).toHaveAttribute('type', 'password')
  })
})

test.describe('Guest login (TC-006)', () => {
  test('a guest gets into the app without an account', async ({ page }) => {
    await loginAsGuest(page)
  })
})

test.describe('Staying logged in and logging out', () => {
  test('refreshing the page keeps you logged in', async ({ page }) => {
    await signUp(page)
    await page.reload()

    await expectLoggedIn(page)
  })

  test('logging out returns to the login page, and a refresh does not log you back in', async ({ page }) => {
    await signUp(page)

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('button', { name: 'Log out' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()
  })
})
