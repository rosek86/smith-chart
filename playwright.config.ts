import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173/smithkit/',
    viewport: { width: 1280, height: 1100 },
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort --base /smithkit/',
    url: 'http://127.0.0.1:4173/smithkit/',
    reuseExistingServer: !process.env.CI,
  },
});
