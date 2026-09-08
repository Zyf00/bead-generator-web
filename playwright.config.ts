import { defineConfig, devices } from '@playwright/test';

const isCi = process.env.CI === 'true';
const port = 3010;
const useExistingServer = process.env.PLAYWRIGHT_USE_EXISTING_SERVER === 'true';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: useExistingServer
    ? undefined
    : {
        command: `NEXT_DIST_DIR=.next-e2e PORT=${port} npm run dev`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: !isCi,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
