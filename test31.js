const WebSocket = require('ws');
const API_KEY = "AIzaSyBHTfcrGvbobSgi1mvnc8kng8vEuHDuiJE";
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

const ws = new WebSocket(WS_URL);
ws.on('open', () => {
  ws.send(JSON.stringify({
    setup: {
      model: "models/gemini-3.1-flash-live-preview",
      generationConfig: { responseModalities: ["AUDIO"] }
    }
  }));
});
ws.on('message', (data) => {
  console.log('MESSAGE:', data.toString());
  ws.close();
});
ws.on('close', (code, reason) => {
  console.log(`CLOSED: ${code} ${reason}`);
});
