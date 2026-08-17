import { defineConfig, devices } from '@playwright/test'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
export const appPath = process.env.GITHUB_ACTIONS && repository ? `/${repository}/` : '/'
const origin = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
    url: `${origin}${appPath}`,
    reuseExistingServer: !process.env.CI,
  },
})
