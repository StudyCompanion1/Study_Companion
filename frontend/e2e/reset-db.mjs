// Deletes the E2E test database so every run starts empty.
// Runs right before the test backend starts (see webServer in playwright.config.ts).
import { rmSync } from 'node:fs'

const file = process.env.E2E_DB_FILE
if (!file || !file.endsWith('e2e-test.db')) {
  // Safety net: never delete anything except the E2E database
  console.error('reset-db: E2E_DB_FILE is missing or is not e2e-test.db, so nothing was deleted.')
  process.exit(1)
}

for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(file + suffix, { force: true })
}
