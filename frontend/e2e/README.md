# End-to-end (E2E) tests

These tests use [Playwright](https://playwright.dev) to click through the real app in a real browser,
with the real backend behind it. How to install and run them is in the main
[README](../../README.md#qa-testing); this page is about **writing** them.

## Running

From the repo root:

| Command | What it does |
| --- | --- |
| `npm run test:e2e` | Runs every test in `frontend/e2e/` |
| `npm run test:e2e -- e2e/collections.spec.ts` | Runs one file |
| `npm run test:e2e -w frontend -- -g "breadcrumb"` | Runs tests whose name contains "breadcrumb" (the `-w frontend` matters: without it npm reads `-g` as its own flag) |
| `npm run test:e2e:ui` | Opens Playwright's visual runner: watch each step, pick tests to run |
| `npx playwright show-report frontend/playwright-report` | Opens the last report (screenshots and a trace of every failure) |

Tests start their own backend (port 8100) and frontend (port 5180) with a throwaway database
(`backend/e2e-test.db`, wiped before every run), so they never touch your `npm run dev` servers or data.

## What's here

| File | Covers |
| --- | --- |
| `smoke.spec.ts` | The app starts and you can get in |
| `auth.spec.ts` | Sign up, log in, guest login, staying logged in, log out |
| `home.spec.ts` | Home sections and the left menu |
| `settings.spec.ts` | Settings and Accessibility panels, theme, text size |
| `collections.spec.ts` | Creating, opening and finding collections; one user can't see another's |
| `materials.spec.ts` | Uploading, previewing and ordering material; notes |
| `chatbot.spec.ts` | The AI chat, with the AI's replies faked |
| `helpers/` | Shared steps: logging in, themes, collections |

## Writing a new test

1. Add a file ending in `.spec.ts` to `frontend/e2e/`, or add a test to the file for that feature.
2. Start from a logged-in user with a helper, then do what a person would do:

```ts
import { expect, test } from '@playwright/test'
import { loginAsGuest } from './helpers/auth.ts'
import { createCollection, openCollections } from './helpers/collections.ts'

test('a new collection shows its course code', async ({ page }) => {
  await loginAsGuest(page)
  await openCollections(page)
  await createCollection(page, { name: 'Cell biology', code: 'BIO 201' })

  await expect(page.getByRole('link', { name: /^Cell biology/ })).toContainText('BIO 201')
})
```

3. Run just that file while you work: `npm run test:e2e -- e2e/<your-file>.spec.ts`.
4. Before opening a pull request, run the whole suite twice. A test that passes only sometimes is
   "flaky" and needs fixing before it's merged.

## Helpers

| Helper | File | What it does |
| --- | --- | --- |
| `loginAsGuest(page)` | `helpers/auth.ts` | Clicks Guest login |
| `signUp(page)` | `helpers/auth.ts` | Creates a new account with a random email; returns it |
| `login(page, user)` | `helpers/auth.ts` | Logs in with an email and password |
| `expectLoggedIn(page)` | `helpers/auth.ts` | Waits until the left menu shows |
| `useTheme(page, 'dark')` | `helpers/theme.ts` | Opens pages in a theme; call before `page.goto()` |
| `openCollections(page)` | `helpers/collections.ts` | Goes to Collections and waits for it to load |
| `createCollection(page, { name, code?, term? })` | `helpers/collections.ts` | Creates a collection through the dialog |
| `collectionCard(page, name)` | `helpers/collections.ts` | Finds a collection's card by its name |

The helpers are shared: say so in Discord before changing one, since other people's tests use them.

## Rules that keep tests reliable

- **Find things the way a person or screen reader would**: `getByRole('button', { name: 'Save' })`,
  `getByLabel('Email')`, `getByText(...)`. Avoid CSS classes; they change with styling. If you can't
  find an element by role or label, that is often an accessibility problem worth reporting.
- **Each test makes its own data.** Use `loginAsGuest` or `signUp` (a new user every time) and create
  what the test needs. Never rely on another test having run first.
- **Let Playwright wait.** `await expect(...).toBeVisible()` retries until the page catches up. Never use
  `page.waitForTimeout(...)`: fixed pauses make tests slow and flaky.
- **Use `exact: true` for short names.** `{ name: 'Settings' }` also matches "Close settings".
- **Fake the AI.** Tests that touch the chatbot replace its reply with `page.route('**/api/chat', ...)`,
  so they need no API key and always get the same answer (see `chatbot.spec.ts`).
- **Browser code needs browser types.** Code inside `page.evaluate(...)` runs in the browser; a file that
  uses `document` there needs `/// <reference lib="dom" />` as its first line, or `npm run build` fails.

## When a test fails

1. Read the terminal: it names the step and shows what it expected and what it found.
2. Open the report (`npx playwright show-report frontend/playwright-report`). Each failure has a
   screenshot and a trace you can step through.
3. Decide whether the **test** is wrong (the app changed on purpose) or the **app** is wrong (a bug).
   Don't loosen a test to make a real bug pass: open a GitHub issue and note it in the Test Case Tracker.
4. A known bug you can't fix yet can be marked `test.fixme(...)` with a comment saying why; it then
   shows as skipped instead of failing everyone's run.
