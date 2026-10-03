import { defineConfig, devices } from '@playwright/test';
const externalBaseURL=process.env.VCH_BASE_URL || '';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: externalBaseURL || 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: externalBaseURL ? undefined : { command: 'npm run dev -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
