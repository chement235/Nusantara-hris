import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "rm -f /tmp/nusantara-hris-test.db /tmp/nusantara-hris-test.db-shm /tmp/nusantara-hris-test.db-wal && HRIS_DB_PATH=/tmp/nusantara-hris-test.db SESSION_SECRET=test-secret npm run dev:test",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
