import { defineConfig, devices } from '@playwright/test';
const externalBaseURL=process.env.VCH_BASE_URL || '';
// Optional local override for a pre-installed Chromium (e.g. sandboxes without Playwright's pinned build).
const launchOptions=process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: externalBaseURL || 'http://127.0.0.1:4173', trace: 'retain-on-failure', launchOptions },
  webServer: externalBaseURL ? undefined : {
    command: 'npx vite preview --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /board-timing\.spec\.js/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /board-timing\.spec\.js/ },
    // Frame-timing measurements run alone, after all other tests, so their load can't drop
    // frames from the measurement.
    { name: 'timing', use: { ...devices['Desktop Chrome'] }, testMatch: /board-timing\.spec\.js/, dependencies: ['desktop', 'mobile'] },
  ],
});
