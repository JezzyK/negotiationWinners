# NegotiateAI — Gemini Live API Integration Plan

Connect the existing static mock UI to Google's **Gemini Live API** (Multimodal Live WebSocket) so that real conference-call audio is streamed to Gemini in real time, and Gemini's structured function calls drive every dynamic element in the UI.

## User Review Required

> [!IMPORTANT]
> **Audio Capture Strategy** — Two options available:
> 1. **System loopback** (`getDisplayMedia({ audio:true, video:false })`): captures all desktop audio (Teams/Zoom output). Works in Chrome; user must share a tab or screen and tick "Share system audio". **Recommended for conference calls.**
> 2. **Microphone** (`getUserMedia({ audio:true })`): captures only local mic. Easier permissions, but misses the far-end voice.
>
> The implementation will support **both** and let the user choose at session start.

> [!WARNING]
> **Gemini Live API billing**: the API key `AIzaSyBHTfcrGvbobSgi1mvnc8kng8vEuHDuiJE` will be charged for every audio token streamed. Keep this in mind during testing.

> [!NOTE]
> This is a **single HTML file** solution — no build step, no server. Everything runs in the browser via the Gemini WebSocket API directly. The API key is embedded client-side (acceptable for a PoC; do not deploy publicly).

---

## Proposed Changes

### New File: `index.html`

#### [NEW] [index.html](file:///c:/Users/uvaks/Repos/negotiateAI-gemLiveApiTest/index.html)

Start from `NegotiateAI — Combined.html` and add/replace the `<script>` section to include:

**1. Gemini Live API WebSocket Connection**
- Endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=API_KEY`
- On open: send `BidiGenerateContentSetup` message with:
  - `model: "models/gemini-2.0-flash-live-001"`
  - `generation_config.response_modalities: ["TEXT"]`
  - `system_instruction`: expert negotiation coach context
  - `tools`: array of 5 function declarations (see below)
- On message: parse `BidiGenerateContentServerContent` (text transcripts) and `BidiGenerateContentToolCall` (function calls) → dispatch to UI handlers

**2. Function Call Schema (declared in setup)**
```json
[
  {
    "name": "update_zopa",
    "description": "Update ZOPA panel when numerical terms are mentioned",
    "parameters": {
      "type": "object",
      "properties": {
        "ourWalkaway": { "type": "number", "description": "Our minimum/walkaway price in €k" },
        "clientMentionedBudget": { "type": "number", "description": "Budget the client mentioned in €k" },
        "currentOffer": { "type": "number", "description": "Current offer on table in €k" }
      }
    }
  },
  {
    "name": "update_analytics",
    "description": "Update phase, sentiment and talk ratio",
    "parameters": {
      "type": "object",
      "properties": {
        "phase": { "type": "string", "enum": ["Rapport","Discovery","Negotiation","Closing"] },
        "sentiment": { "type": "string", "enum": ["Positive","Neutral","Friction"] },
        "clientTalkPct": { "type": "number", "description": "0-100, client talk percentage" }
      }
    }
  },
  {
    "name": "suggest_directive",
    "description": "Show a coaching hint in the WHAT TO SAY panel",
    "parameters": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "enum": ["tactic","warning"] },
        "message": { "type": "string" }
      },
      "required": ["type","message"]
    }
  },
  {
    "name": "show_battlecard",
    "description": "Show competitor battlecard popup",
    "parameters": {
      "type": "object",
      "properties": {
        "competitorName": { "type": "string" },
        "talkingPoints": { "type": "array", "items": { "type": "string" } },
        "displaySeconds": { "type": "number" }
      },
      "required": ["competitorName","talkingPoints"]
    }
  },
  {
    "name": "add_trigger",
    "description": "Add an event chip to the trigger log at the bottom",
    "parameters": {
      "type": "object",
      "properties": {
        "emoji": { "type": "string" },
        "label": { "type": "string" }
      },
      "required": ["label"]
    }
  }
]
```

**3. Audio Capture Module**
- Button: "🎙 Start Session" → shows source picker (System Audio / Microphone)
- **System audio**: `navigator.mediaDevices.getDisplayMedia({ video: false, audio: { echoCancellation: false, noiseSuppression: false } })` → `AudioContext` → `ScriptProcessorNode` (4096 samples) → downsample to 16kHz → PCM → base64 → `BidiGenerateContentRealtimeInput`
- **Microphone**: same pipeline but with `getUserMedia`
- Talk ratio: measured by RMS power of incoming PCM chunks — separate client vs server tracks using VAD heuristic
- "⏹ Stop Session" → close stream, close WebSocket

**4. UI Wiring — replace all demo `setInterval` animations with Gemini-driven updates**

| Gemini function | UI element |
|---|---|
| `update_zopa` | `z-us`, `z-them`, `z-zopa`, ZOPA labels |
| `update_analytics.phase` | `mode-text`, `mode-glow` class (coop/opp) |
| `update_analytics.sentiment` | mode glow color (green/amber/red) |
| `update_analytics.clientTalkPct` | `sr-them`, `sr-us` labels |
| `suggest_directive` | `hint-text` with fade animation |
| `show_battlecard` | `bc` panel with timer countdown |
| `add_trigger` | prepend `.trig.fresh` chip to `.trigger-log` |

**5. Session Controls UI** (added to header area):
- Status badge: `● Connecting` / `● Listening` / `● Analyzing` with color coding
- Start / Stop button
- Audio source selector (before start)

**6. Preserve all existing features:**
- i18n language switcher (EN/PL/UA/RU)
- Timer & agenda tracker (still runs client-side)
- Battlecard manual close button

---

## Verification Plan

### Manual Testing (browser)

1. **Open `index.html` directly** in Chrome (double-click or `file://` URL)
2. **Start Session → System Audio**: share a browser tab playing audio (e.g., a YouTube video of people talking)
   - Verify: status badge changes to `● Listening`
   - Verify: waveform becomes active
   - Verify: within ~10s, Gemini sends at least one text transcript visible in browser console
3. **Function call verification**: speak the trigger phrase "SAP" out loud or pipe it via the audio source
   - Verify: battlecard slides in with SAP talking points
   - Verify: trigger chip "⚡ Competitor: SAP" appears at bottom
4. **ZOPA update**: say "our budget is 90,000 euros"
   - Verify: ZOPA bar shifts
5. **Stop Session**: click Stop
   - Verify: WebSocket closes cleanly, status returns to idle
6. **Language switch**: change to PL, verify all labels update

### Console Verification
- Open DevTools → Console. All WebSocket messages are logged in raw form for debugging.
- Check for `[GEMINI TOOL CALL]` log lines when functions fire.
