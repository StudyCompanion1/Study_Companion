import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

/*
 * End-to-end (E2E) tests: a real browser clicks through the real app,
 * with the real FastAPI backend and its own throwaway SQLite database.
 *
 * Run them with:  npm run test:e2e        (from the repo root)
 * Visual runner:  npm run test:e2e:ui
 *
 * The tests start their own servers on separate ports (5180 and 8100),
 * so they never touch your `npm run dev` servers (5173 and 8000) or your local data.
 */

const FRONTEND_DIR = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = path.resolve(FRONTEND_DIR, '../backend')

const WEB_PORT = 5180
const API_PORT = 8100
const API_URL = `http://127.0.0.1:${API_PORT}`

// Throwaway database, wiped before every run by e2e/reset-db.mjs (git ignores *.db)
export const E2E_DB_FILE = path.join(BACKEND_DIR, 'e2e-test.db')
const E2E_DB_URL = `sqlite:///${E2E_DB_FILE.replaceAll('\\', '/')}`

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  // Every test makes its own user, so tests can run side by side
  fullyParallel: true,
  // A stray test.only fails the CI run instead of silently skipping everything else
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // On failure, keep a screenshot and a step-by-step trace (open it with: npx playwright show-trace <file>)
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      name: 'api',
      // Wipe the test database, then start FastAPI against it
      command: `node "${path.join(FRONTEND_DIR, 'e2e/reset-db.mjs')}" && uv run fastapi run app/main.py --host 127.0.0.1 --port ${API_PORT}`,
      cwd: BACKEND_DIR,
      url: `${API_URL}/docs`,
      env: {
        E2E_DB_FILE,
        DATABASE_URL: E2E_DB_URL,
        // Fixed key so logins survive for the whole run. Not a real secret: test servers only.
        SECRET_KEY: 'e2e-tests-only-not-a-real-secret',
        COOKIE_SECURE: 'false',
      },
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      name: 'web',
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: FRONTEND_DIR,
      url: `http://localhost:${WEB_PORT}`,
      // vite.config.ts sends /api requests here instead of the usual :8000
      env: { API_PROXY_TARGET: API_URL },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
