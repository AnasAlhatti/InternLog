import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const output = path.resolve(import.meta.dirname, '../../generated-artifacts/internlog');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: path.join(output, 'test-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(output, 'playwright-report'), open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Playwright creates a fresh, non-persistent context for each test.
    // Never load storageState or connect to a user's existing browser.
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: {
        // Replit provides a Nix-compatible browser; CI uses Playwright's install.
        executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      },
    },
  }],
  webServer: {
    command: 'pnpm run build && pnpm run serve -- --strictPort',
    url: 'http://127.0.0.1:4173',
    env: { PORT: '4173', BASE_PATH: '/', NODE_ENV: 'production' },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
