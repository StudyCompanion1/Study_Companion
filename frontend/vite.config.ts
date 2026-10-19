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
})
