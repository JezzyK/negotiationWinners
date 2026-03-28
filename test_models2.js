const WebSocket = require('ws');
const API_KEY = "AIzaSyBHTfcrGvbobSgi1mvnc8kng8vEuHDuiJE";

const models = [
  "models/gemini-2.0-flash-exp",
  "models/gemini-2.0-flash",
  "models/gemini-2.0-flash-001",
  "models/gemini-2.0-pro-exp",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash"
];

const versions = ['v1alpha', 'v1beta'];

async function testModel(modelName, version) {
  return new Promise((resolve) => {
    const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${version}.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
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
      console.log(`[${version}] [${modelName}] SUCCESS - received data`);
      ws.close();
      resolve(true);
    });
    ws.on('close', (code, reason) => {
      let r = reason.toString();
      console.log(`[${version}] [${modelName}] FAILED - code: ${code}, reason: ${r.substring(0, 50)}...`);
      resolve(false);
    });
    ws.on('error', (err) => {
      resolve(false);
    });
  });
}

async function run() {
  const fs = require('fs');
  fs.writeFileSync('result2.txt', '');
  const log = (msg) => {
      console.log(msg);
      fs.appendFileSync('result2.txt', msg + '\n');
  }
  
  for (const v of versions) {
      for (const m of models) {
        log(`Testing ${v} ${m}`);
        await testModel(m, v).then(ok => log(`Result: ${ok}`));
      }
  }
}

run();
