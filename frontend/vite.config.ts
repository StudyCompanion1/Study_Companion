import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 127.0.0.1, not localhost: uvicorn binds IPv4 only, and on some machines
      // Node resolves localhost to ::1 (IPv6), which makes the proxy fail
      '/api': 'http://127.0.0.1:8000'
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      all: true,
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
