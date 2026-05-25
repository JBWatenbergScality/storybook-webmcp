import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/integration',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:6007',
    headless: true,
  },
  webServer: {
    command: 'npx --yes http-server examples/fixture-sb/storybook-static -p 6007 -s --cors',
    url: 'http://localhost:6007',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
