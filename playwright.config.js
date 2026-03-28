const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Record trace and video for tests
    trace: 'on-first-retry',
    video: 'on', 
    
    // Test locally running app
    baseURL: 'http://localhost:3000',
    
    // Grant microphone permissions automatically without prompting
    contextOptions: {
      permissions: ['microphone'],
    },
    
    // Launch headless false (headed mode) as requested by user
    headless: false,
    
    // Useful to bypass actual device restrictions
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
