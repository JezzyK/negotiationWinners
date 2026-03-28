module.exports = {
  testDir: './',
  testMatch: /.*\.spec\.js/,
  reporter: [['html', { open: 'never', outputFolder: 'test-report' }]],
  use: {
    headless: false,
    video: 'on',
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--no-sandbox',
        '--allow-insecure-localhost'
      ]
    }
  }
};
