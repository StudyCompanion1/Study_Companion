import type { Page } from '@playwright/test'

export type Theme = 'light' | 'dark' | 'high-contrast'

/**
 * Starts the page in a theme, the same way the app remembers it (localStorage "theme").
 * Call before page.goto().
 */
export async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
}
