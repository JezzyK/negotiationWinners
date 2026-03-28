const { test, expect } = require('@playwright/test');

const APP_URL = 'http://localhost:3000';
const API_KEY = 'AIzaSyDQZmVZprDxKvshuOh5WdIGZBdHwm1u1bU';

// Mock getUserMedia BEFORE navigation using a shared setup
function setupMediaMock(page) {
    return page.addInitScript(() => {
        // Override getUserMedia to provide a silent audio stream
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = async () => {
                const ctx = new AudioContext({ sampleRate: 16000 });
                const osc = ctx.createOscillator();
                const dest = ctx.createMediaStreamDestination();
                osc.connect(dest);
                osc.start();
                return dest.stream;
            };
        }
    });
}

test.describe('Negotiate-Copilot MVP UI Tests', () => {

    test('Initial UI State', async ({ page }) => {
        await setupMediaMock(page);
        await page.goto(APP_URL);
        await page.waitForLoadState('domcontentloaded');

        // Header elements
        await expect(page.locator('#api-key-input')).toBeVisible();
        await expect(page.locator('#session-btn')).toContainText('START SESSION');
        await expect(page.locator('#status-text')).toHaveText('Offline');

        // Dashboard
        await expect(page.locator('#strategy-title')).toHaveText('BATNA');
        await expect(page.locator('#phase-badge')).toContainText(/AWAITING AUDIO/i);

        // Panels closed
        await expect(page.locator('#pros-cons-panel')).not.toHaveClass(/open/);
        await expect(page.locator('#dev-console-panel')).not.toHaveClass(/open/);
    });

    test('Dev Console Opens, Closes, and Shows Formatted Logs', async ({ page }) => {
        await setupMediaMock(page);
        await page.goto(APP_URL);

        const panel = page.locator('#dev-console-panel');

        // Open dev console
        await page.click('#dev-console-toggle');
        await expect(panel).toHaveClass(/open/);

        // Should have initial message
        await expect(page.locator('#log-area')).toContainText('Ready');

        // Close via X button
        await page.click('#dev-console-panel .close-btn');
        await expect(panel).not.toHaveClass(/open/);

        // Reopen
        await page.click('#dev-console-toggle');
        await expect(panel).toHaveClass(/open/);
    });

    test('Session Connects to Gemini and Shows LIVE Status', async ({ page }) => {
        await setupMediaMock(page);
        await page.goto(APP_URL);

        // Open dev console first so we can see logs
        await page.click('#dev-console-toggle');
        await expect(page.locator('#dev-console-panel')).toHaveClass(/open/);

        // Enter API key
        await page.fill('#api-key-input', API_KEY);

        // Start session
        await page.click('#session-btn');

        // Should show CONNECTING state immediately
        await expect(page.locator('#session-btn')).toContainText('CONNECTING', { timeout: 3000 });

        // Wait for LIVE status (WebSocket setup complete)
        await expect(page.locator('#status-text')).toHaveText('LIVE', { timeout: 15000 });

        // Session button should change to STOP
        await expect(page.locator('#session-btn')).toContainText('STOP SESSION');

        // Status dot should have 'live' class
        await expect(page.locator('#status-dot')).toHaveClass(/live/);

        // Phase badge should show LISTENING
        await expect(page.locator('#phase-badge')).toContainText(/LISTENING/i);

        // Timer should be ticking (not 00:00 after a brief wait)
        await page.waitForTimeout(2000);
        const timerText = await page.locator('#timer').textContent();
        expect(timerText).not.toBe('00:00');

        // Dev console should have connection logs
        const logArea = page.locator('#log-area');
        await expect(logArea).toContainText('Opening fresh WebSocket');
        await expect(logArea).toContainText('WebSocket upgraded');
        await expect(logArea).toContainText('gemini-3.1-flash-live-preview');

        // Verify blue (outgoing) and purple (incoming) log entries
        const outLogs = page.locator('.log-block-out');
        expect(await outLogs.count()).toBeGreaterThan(0);
        const inLogs = page.locator('.log-block-in');
        expect(await inLogs.count()).toBeGreaterThan(0);

        // Take a screenshot for report
        await page.screenshot({ path: 'test-results/live-session.png', fullPage: true });

        // --- Session stability: keep alive 5 seconds and verify still LIVE ---
        await page.waitForTimeout(5000);
        await expect(page.locator('#status-text')).toHaveText('LIVE');
        await expect(page.locator('#status-dot')).toHaveClass(/live/);

        // Stop session
        await page.click('#session-btn');
        await page.waitForTimeout(1000);

        // Should return to offline
        await expect(page.locator('#status-text')).toHaveText('Offline');
        await expect(page.locator('#session-btn')).toContainText('START SESSION');

        await page.screenshot({ path: 'test-results/session-stopped.png', fullPage: true });
    });

    test('Session Does NOT Resume — Fresh Connection Each Time', async ({ page }) => {
        await setupMediaMock(page);
        await page.goto(APP_URL);

        // Open dev console
        await page.click('#dev-console-toggle');

        // First session
        await page.fill('#api-key-input', API_KEY);
        await page.click('#session-btn');
        await expect(page.locator('#status-text')).toHaveText('LIVE', { timeout: 15000 });

        // Stop
        await page.click('#session-btn');
        await page.waitForTimeout(1500);
        await expect(page.locator('#status-text')).toHaveText('Offline');

        // Clear dev console logs
        await page.click('#dev-console-panel .panel-controls button');
        await page.waitForTimeout(500);

        // Second session — should be fresh
        await page.click('#session-btn');
        await expect(page.locator('#status-text')).toHaveText('LIVE', { timeout: 15000 });

        // Dev console should show fresh connection message
        const logArea = page.locator('#log-area');
        await expect(logArea).toContainText('Opening fresh WebSocket');
        await expect(logArea).toContainText('no session resume');

        // Timer should have reset
        const timerText = await page.locator('#timer').textContent();
        const [min, sec] = timerText.split(':').map(Number);
        expect(min * 60 + sec).toBeLessThan(10);

        // Stop
        await page.click('#session-btn');
        await page.waitForTimeout(1000);
        await expect(page.locator('#status-text')).toHaveText('Offline');
    });
});
