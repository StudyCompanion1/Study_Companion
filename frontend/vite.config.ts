import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 127.0.0.1, not localhost: uvicorn binds IPv4 only, and on some machines
      // Node resolves localhost to ::1 (IPv6), which makes the proxy fail
      // (E2E tests set API_PROXY_TARGET to their own test backend; see playwright.config.ts)
      '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000'
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // e2e/ holds Playwright tests, which run with `npm run test:e2e`, not Vitest
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Bootstrap files: render into a real #root element, nothing to unit test
      exclude: ['src/main.tsx', 'src/collections/preview.tsx'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
