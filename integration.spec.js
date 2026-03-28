const { test, expect } = require('@playwright/test');
const http = require('http');
const WebSocket = require('ws');

// ─── MOCK WEBSOCKET SERVER ───────────────────────────────────────────────────
let mockWss;
let mockPort = 8765;

function startMockServer() {
  return new Promise((resolve) => {
    const httpServer = http.createServer();
    mockWss = new WebSocket.Server({ server: httpServer });

    mockWss.on('connection', (socket) => {
      console.log('[mock-ws] Client connected');
      socket.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.setup) {
          console.log('[mock-ws] Got setup, sending setupComplete');
          socket.send(JSON.stringify({ setupComplete: {} }));

          // Simulate coming AI tool calls after a short delay
          setTimeout(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                toolCall: {
                  functionCalls: [{
                    id: 'call_001',
                    name: 'suggest_directive',
                    args: { type: 'tactic', message: 'Ask about their timeline' }
                  }]
                }
              }));
            }
          }, 2000);

          setTimeout(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                toolCall: {
                  functionCalls: [{
                    id: 'call_002',
                    name: 'update_analytics',
                    args: { phase: 'Negotiation', sentiment: 'Friction' }
                  }]
                }
              }));
            }
          }, 4000);

          setTimeout(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                toolCall: {
                  functionCalls: [{
                    id: 'call_003',
                    name: 'show_battlecard',
                    args: { competitorName: 'SAP', talkingPoints: ['Deploy in 2 weeks vs 18 months', '40% lower TCO'], displaySeconds: 5 }
                  }]
                }
              }));
            }
          }, 6000);

          setTimeout(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                toolCall: {
                  functionCalls: [{
                    id: 'call_004',
                    name: 'update_zopa',
                    args: { clientMentionedBudget: 90, ourWalkaway: 85 }
                  }]
                }
              }));
            }
          }, 8000);
        }

        if (msg.toolResponse) {
          console.log('[mock-ws] Received tool response ACK');
        }
      });

      socket.on('close', () => console.log('[mock-ws] Client disconnected'));
    });

    httpServer.listen(mockPort, () => {
      console.log(`[mock-ws] Server running on ws://localhost:${mockPort}`);
      resolve();
    });
  });
}

function stopMockServer() {
  return new Promise((resolve) => {
    if (mockWss) mockWss.close(() => resolve());
    else resolve();
  });
}

// ─── TEST ────────────────────────────────────────────────────────────────────

test.describe('NegotiateAI Integration', () => {

  test.beforeAll(async () => {
    await startMockServer();
  });

  test.afterAll(async () => {
    await stopMockServer();
  });

  test('Session held for 10+ seconds with full UI updates from mock Gemini', async ({ page }) => {
    page.on('console', msg => console.log('PAGE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Patch the WS_URL to point to our mock server
    await page.addInitScript((port) => {
      window.__MOCK_WS_PORT = port;
      // Override WS_URL at script-load time
      const origFetch = window.fetch;
      // Monkey-patch: set constant after scripts load
    }, mockPort);

    // Intercept app.js and rewrite the WS_URL
    await page.route('**/app.js', async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      // Replace the real Gemini WS URL with our local mock
      body = body.replace(
        /const WS_URL = `wss:\/\/.*?`;/,
        `const WS_URL = \`ws://localhost:${mockPort}\`;`
      );
      route.fulfill({ body, contentType: 'text/javascript' });
    });

    await page.goto('http://localhost:8080');

    // Choose mic source
    await page.locator('#audio-src').selectOption('mic');

    // 1. Verify idle state
    await expect(page.locator('#status-text')).toHaveText('Idle');

    // 2. Click Start Session
    await page.locator('#btn-session').click();

    // 3. Wait for Listening (mock sends setupComplete immediately)
    await expect(page.locator('#status-text')).toHaveText('Listening', { timeout: 10000 });

    // 4. Verify button text changed
    await expect(page.locator('#btn-session')).toHaveText('⏹ Stop Session');

    // 5. ── HOLD SESSION FOR 10 SECONDS ──
    console.log('Session active - holding for 10 seconds...');
    await page.waitForTimeout(10000);

    // 6. Verify session STILL active after 10 seconds
    await expect(page.locator('#status-text')).toHaveText('Listening', { timeout: 2000 });
    await expect(page.locator('#btn-session')).toHaveText('⏹ Stop Session');

    // 7. Verify tool calls triggered UI updates while waiting
    // AI should have sent update_analytics => phase changes to Negotiation
    await expect(page.locator('#mode-text')).toContainText('Negotiation');

    // 8. Stop the session
    await page.locator('#btn-session').click();
    await expect(page.locator('#status-text')).toHaveText('Idle', { timeout: 5000 });

    console.log('✓ Session held for 10+ seconds and UI updated correctly');
  });

});
