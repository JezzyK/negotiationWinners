const WebSocket = require('ws');
const API_KEY = "AIzaSyBHTfcrGvbobSgi1mvnc8kng8vEuHDuiJE";
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

const toolDeclarations = [
  {
    name: "update_zopa",
    description: "Update ZOPA panel when numerical terms are mentioned in the conversation.",
    parameters: {
      type: "object",
      properties: {
        ourWalkaway: { type: "number", description: "Our minimum/walkaway price in €k (if revealed)" },
        clientMentionedBudget: { type: "number", description: "Budget the client mentioned in €k" },
        currentOffer: { type: "number", description: "Current offer on table in €k" }
      }
    }
  },
  {
    name: "update_analytics",
    description: "Update the phase of negotiation and sentiment.",
    parameters: {
      type: "object",
      properties: {
        phase: { type: "string", enum: ["Rapport","Discovery","Negotiation","Closing"] },
        sentiment: { type: "string", enum: ["Positive","Neutral","Friction"] }
      }
    }
  },
  {
    name: "suggest_directive",
    description: "Give a direct coaching hint to the seller based on exactly what was just said.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["tactic","warning"] },
        message: { type: "string", description: "A very short, punchy instruction (max 10 words)" }
      },
      required: ["type","message"]
    }
  },
  {
    name: "show_battlecard",
    description: "Show a competitor battlecard when a competitor is mentioned.",
    parameters: {
      type: "object",
      properties: {
        competitorName: { type: "string" },
        talkingPoints: { type: "array", items: { type: "string" } },
        displaySeconds: { type: "number" }
      },
      required: ["competitorName","talkingPoints"]
    }
  },
  {
    name: "add_trigger",
    description: "Add a minor event chip to the log (like 'budget gap' or 'pause 7s' or 'contradiction').",
    parameters: {
      type: "object",
      properties: {
        emoji: { type: "string", description: "A single emoji representing the event" },
        label: { type: "string", description: "Short textual description (max 3 words)" }
      },
      required: ["label"]
    }
  }
];

const ws = new WebSocket(WS_URL);
ws.on('open', () => {
  ws.send(JSON.stringify({
    setup: {
      model: "models/gemini-3.1-flash-live-preview",
      generationConfig: {
        responseModalities: ["AUDIO"]
      },
      systemInstruction: {
        parts: [{ text: "You are an expert negotiation coach observing a live tech-B2B conference call. \
Listen to the audio and aggressively use the provided tool functions to update the dashboard. \
Do not output long text or audio replies. Just call tools. \
If you hear a competitor name (like SAP, Oracle, etc.), immediately call show_battlecard. \
If you hear them talk about money, budget, or offers, call update_zopa. \
Periodically call update_analytics to set the phase. Provide short, actionable suggest_directive hints during the conversation." }]
      },
      tools: [{ functionDeclarations: toolDeclarations }]
    }
  }));
});

ws.on('message', (data) => {
  console.log('MESSAGE:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log(`CLOSED: ${code} ${reason}`);
});

ws.on('error', (err) => console.log('ERROR:', err));
