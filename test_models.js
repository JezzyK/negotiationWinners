const WebSocket = require('ws');
const API_KEY = "AIzaSyBHTfcrGvbobSgi1mvnc8kng8vEuHDuiJE";

const models = [
  "models/gemini-2.0-flash-exp",
  "models/gemini-2.0-flash",
  "models/gemini-2.0-flash-001",
  "models/gemini-2.0-flash-lite",
  "models/gemini-2.0-flash-lite-001",
  "models/gemini-2.5-flash",
  "models/gemini-2.0-pro-exp"
];

async function testModel(modelName) {
  return new Promise((resolve) => {
    const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        setup: {
          model: modelName,
          generationConfig: { responseModalities: ["TEXT"] }
        }
      }));
    });
    ws.on('message', (data) => {
      console.log(`[${modelName}] SUCCESS - received data`);
      ws.close();
      resolve(true);
    });
    ws.on('close', (code, reason) => {
      console.log(`[${modelName}] FAILED - code: ${code}, reason: ${reason.toString()}`);
      resolve(false);
    });
    ws.on('error', (err) => {
      resolve(false);
    });
  });
}

async function run() {
  for (const m of models) {
    await testModel(m);
  }
}

run();
