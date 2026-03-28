/**
 * ═══════════════════════════════════════════════════════════════════════
 *  NEGOTIATE-COPILOT — app.js
 *  Real-time negotiation coaching powered by Gemini Live API
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── Configuration ─────────────────────────────────────────────────────
const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL_ID = 'models/gemini-3.1-flash-live-preview';
const TARGET_SAMPLE_RATE = 16000;
const AUDIO_CHUNK_SIZE = 4096;
const SPEAKING_RMS_THRESHOLD = 0.015;
const CONNECTION_TIMEOUT_MS = 15000;

// ─── State ─────────────────────────────────────────────────────────────
let ws = null;
let isSessionActive = false;
let isSpeaking = false;
let audioContext = null;
let mediaStream = null;
let processorNode = null;
let analyserNode = null;
let timerInterval = null;
let sessionSeconds = 0;
let sessionLog = [];
let sessionStartTime = null;


// ─── TRANSLATIONS ──────────────────────────────────────────────────────
const translations = {
    en: {
        roles: { client: "CLIENT", you: "YOU" },
        ui: {
            startSession: "START SESSION",
            stopSession: "STOP SESSION",
            offline: "Offline",
            live: "LIVE",
            listening: "LISTENING...",
            awaitingAudio: "AWAITING AUDIO",
            connecting: "CONNECTING...",
            batna: "BATNA",
            hintBox: "💡 What to Say",
            keyEvents: "📌 Key Events",
            contextInsights: "⚡ Context Insights",
            devConsole: "🖥️ Developer Console",
            awaitingContext: "Awaiting context triggers...",
            waitingHint: "Waiting for negotiation context…"
        },
        agenda: {
            smallTalk: "Small-Talk",
            discovery: "Discovery",
            negotiation: "Negotiation",
            objections: "Objections",
            agreement: "Agreement"
        },
        battlecard: {
            clientAnchor: "Client Anchor",
            yourTarget: "Your Target",
            zopa: "ZOPA"
        }
    },
    pl: {
        roles: { client: "KLIENT", you: "TY" },
        ui: {
            startSession: "ROZPOCZNIJ SESJĘ",
            stopSession: "ZAKOŃCZ SESJĘ",
            offline: "Offline",
            live: "NA ŻYWO",
            listening: "NASŁUCHIWANIE...",
            awaitingAudio: "OCZEKIWANIE NA DŹWIĘK",
            connecting: "ŁĄCZENIE...",
            batna: "BATNA",
            hintBox: "💡 Co Powiedzieć",
            keyEvents: "📌 Kluczowe Wydarzenia",
            contextInsights: "⚡ Kontekst i Wskazówki",
            devConsole: "🖥️ Konsola Programisty",
            awaitingContext: "Oczekiwanie na kontekst...",
            waitingHint: "Oczekiwanie na kontekst negocjacji…"
        },
        agenda: {
            smallTalk: "Small-Talk",
            discovery: "Odkrywanie",
            negotiation: "Negocjacje",
            objections: "Obiekcje",
            agreement: "Porozumienie"
        },
        battlecard: {
            clientAnchor: "Kotwica Klienta",
            yourTarget: "Twój Cel",
            zopa: "ZOPA"
        }
    },
    ua: {
        roles: { client: "КЛІЄНТ", you: "ВИ" },
        ui: {
            startSession: "ПОЧАТИ СЕСІЮ",
            stopSession: "ЗУПИНИТИ СЕСІЮ",
            offline: "Офлайн",
            live: "НАЖИВО",
            listening: "СЛУХАЮ...",
            awaitingAudio: "ОЧІКУВАННЯ ЗВУКУ",
            connecting: "ПІДКЛЮЧЕННЯ...",
            batna: "BATNA",
            hintBox: "💡 Що сказати",
            keyEvents: "📌 Ключові події",
            contextInsights: "⚡ Інсайти контексту",
            devConsole: "🖥️ Консоль розробника",
            awaitingContext: "Очікування контексту...",
            waitingHint: "Очікування на контекст переговорів…"
        },
        agenda: {
            smallTalk: "Коротка розмова",
            discovery: "З'ясування",
            negotiation: "Переговори",
            objections: "Заперечення",
            agreement: "Угода"
        },
        battlecard: {
            clientAnchor: "Якір клієнта",
            yourTarget: "Ваша ціль",
            zopa: "ZOPA"
        }
    }
};

function setLanguage(lang) {
    document.documentElement.lang = lang;
    const t = translations[lang];
    if (!t) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const keys = key.split('.');
        let val = t;
        for (let k of keys) {
            if (val) val = val[k];
        }
        if (val) {
            if (el.tagName === 'INPUT' && el.type === 'button') el.value = val;
            else el.textContent = val;
        }
    });

    if (ui && ui.ratioClient && ui.ratioClient.textContent) {
        const clientMatch = ui.ratioClient.textContent.match(/(\d+%|—%)/);
        const clientPct = clientMatch ? clientMatch[0] : '—%';
        ui.ratioClient.textContent = `${t.roles.client}  ${clientPct}`;
    }
    if (ui && ui.ratioYou && ui.ratioYou.textContent) {
        const youMatch = ui.ratioYou.textContent.match(/(\d+%|—%)/);
        const youPct = youMatch ? youMatch[0] : '—%';
        ui.ratioYou.textContent = `${t.roles.you}  ${youPct}`;
    }

    if (ui && ui.phaseBadge && ui.phaseBadge.textContent) {
        const currentText = ui.phaseBadge.getAttribute('data-raw-phase') || ui.phaseBadge.textContent;
        
        if (currentText === 'LISTENING...') ui.phaseBadge.textContent = t.ui.listening;
        else if (currentText.toLowerCase() === 'awaiting audio') ui.phaseBadge.textContent = t.ui.awaitingAudio;
        else {
            const lowerText = currentText.toLowerCase();
            const enAgenda = translations.en.agenda;
            const matchedKey = Object.keys(enAgenda).find(k => enAgenda[k].toLowerCase() === lowerText);
            
            if (matchedKey && t.agenda[matchedKey]) {
                ui.phaseBadge.textContent = t.agenda[matchedKey].toUpperCase();
            } else {
                ui.phaseBadge.textContent = currentText.toUpperCase();
            }
        }
    }
    
    if (ui && ui.statusText) {
        if (isSessionActive) ui.statusText.textContent = t.ui.live;
        else ui.statusText.textContent = t.ui.offline;
    }

    if (ui && ui.sessionBtn) {
        if (isSessionActive) {
            ui.sessionBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg> ${t.ui.stopSession}`;
        } else if (ui.sessionBtn.disabled) {
            ui.sessionBtn.innerHTML = `<span style="animation: pulse-dot 1s infinite">●</span> ${t.ui.connecting}`;
        } else {
            ui.sessionBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ${t.ui.startSession}`;
        }
    }
}

// ─── DOM Refs ──────────────────────────────────────────────────────────
const ui = {};
function cacheDom() {
    ui.apiKeyInput    = document.getElementById('api-key-input');
    ui.sessionBtn     = document.getElementById('session-btn');
    ui.devConsoleToggle = document.getElementById('dev-console-toggle');
    ui.devConsolePanel = document.getElementById('dev-console-panel');
    ui.prosConsPanel  = document.getElementById('pros-cons-panel');
    ui.statusDot      = document.getElementById('status-dot');
    ui.statusText     = document.getElementById('status-text');
    ui.timerDisplay   = document.getElementById('timer');
    ui.phaseBadge     = document.getElementById('phase-badge');
    ui.strategyTitle  = document.getElementById('strategy-title');
    ui.batnaDetails   = document.getElementById('batna-details');
    ui.valClientAnchor = document.getElementById('val-client-anchor');
    ui.valYourTarget  = document.getElementById('val-your-target');
    ui.valZopa        = document.getElementById('val-zopa');
    ui.hintBox        = document.getElementById('hint-box');
    ui.hintText       = document.getElementById('hint-text');
    ui.ratioClient    = document.getElementById('ratio-client');
    ui.ratioYou       = document.getElementById('ratio-you');
    ui.timeline       = document.getElementById('timeline-events');
    ui.prosConsContent = document.getElementById('pros-cons-content');
    ui.logArea        = document.getElementById('log-area');
    ui.autoScroll     = document.getElementById('auto-scroll-toggle');
    ui.audioCanvas    = document.getElementById('audio-canvas');
}


// ═══════════════════════════════════════════════════════════════════════
//  TOOL DECLARATIONS
//  These are sent to Gemini so it returns structured JSON function calls
// ═══════════════════════════════════════════════════════════════════════

const toolDeclarations = [
    {
        name: 'update_zopa',
        description: 'Update the ZOPA (Zone of Possible Agreement) display with negotiation anchors and range. Call this when price points, anchors, or terms are mentioned.',
        parameters: {
            type: 'object',
            properties: {
                framework_label: { type: 'string', description: 'Strategy framework title, e.g. BATNA, ZOPA' },
                client_anchor:   { type: 'string', description: "Client's stated price or term anchor" },
                your_target:     { type: 'string', description: 'Recommended target price/term for the user' },
                zopa_range:      { type: 'string', description: 'Zone of Possible Agreement range, e.g. "$45K - $60K"' }
            }
        }
    },
    {
        name: 'update_analytics',
        description: 'Update the live analytics dashboard: current negotiation phase, talk-time ratio. Call this frequently as the conversation progresses.',
        parameters: {
            type: 'object',
            properties: {
                phase:              { type: 'string', description: 'Current negotiation phase: Small-talk, Discovery, Negotiation, Objections, Agreement, Closing' },
                talk_ratio_client:  { type: 'integer', description: 'Estimated percentage of time client has been speaking (0-100)' },
                talk_ratio_you:     { type: 'integer', description: 'Estimated percentage of time user has been speaking (0-100)' }
            }
        }
    },
    {
        name: 'suggest_directive',
        description: 'Show a tactical directive/hint telling the user what to say or do next. Use this for real-time coaching.',
        parameters: {
            type: 'object',
            properties: {
                text:    { type: 'string', description: 'Concise, actionable tactical hint for the user' },
                urgency: { type: 'string', description: 'Urgency level', enum: ['low', 'medium', 'high'] }
            },
            required: ['text']
        }
    },
    {
        name: 'show_battlecard',
        description: 'Slide out a context panel with pros, cons, and intel about a competitor, product, or objection topic. Triggered when specific topics need deeper context.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the topic/competitor/objection' },
                pros:  { type: 'array', items: { type: 'string' }, description: 'List of strengths/advantages' },
                cons:  { type: 'array', items: { type: 'string' }, description: 'List of weaknesses/risks' }
            },
            required: ['title', 'pros', 'cons']
        }
    },
    {
        name: 'add_trigger',
        description: 'Log a key event to the negotiation timeline. Call when a significant moment occurs: anchor dropped, competitor mentioned, commitment made, phase shift, etc.',
        parameters: {
            type: 'object',
            properties: {
                label: { type: 'string', description: 'Highly concise event label, e.g. "Competitor AcmeCorp mentioned"' }
            },
            required: ['label']
        }
    }
];


// ─── System Instruction ────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
You are a world-class real-time negotiation coach AI.
You are listening to a live audio stream of a negotiation between the user ("You") and a "Client".
Your ONLY job is to analyze the conversation and call the provided tools to update the user's dashboard.

Rules:
- ANY time a new phase of negotiation begins, YOU MUST call update_analytics to set the current phase.
- IF you detect actionable tactical advice to give the user, YOU MUST call suggest_directive immediately.
- ANY time price anchors, terms, or BATNA-related info is mentioned by either party, YOU MUST call update_zopa.
- ANY time a significant moment occurs (competitor mentioned, commitment made, phase shift, objections), YOU MUST call add_trigger to log the event.
- IF a competitor, specific product, or major objection needs deeper context, YOU MUST call show_battlecard.
- Keep all tool parameters concise and direct. This is a real-time HUD, not a report.
- DO NOT respond with text or voice greetings, ONLY USE TOOLS. 
`.trim();


// ═══════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Convert an ArrayBuffer to a base64 string */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** Format seconds → MM:SS */
function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}


// ═══════════════════════════════════════════════════════════════════════
//  SESSION FILE LOGGER
// ═══════════════════════════════════════════════════════════════════════

function addToSessionLog(direction, source, data) {
    sessionLog.push({
        time: new Date().toISOString(),
        elapsed: sessionSeconds,
        direction,
        source,
        data
    });
}

function downloadSessionLog() {
    if (sessionLog.length === 0) return;
    const filename = `session_${sessionStartTime || Date.now()}.json`;
    const blob = new Blob([JSON.stringify(sessionLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}


// ═══════════════════════════════════════════════════════════════════════
//  DEV CONSOLE LOGGER
// ═══════════════════════════════════════════════════════════════════════

function logToConsole(source, data, type = 'in') {
    addToSessionLog(type === 'out' ? 'OUT' : (type === 'in' ? 'IN' : 'SYSTEM'), source, data);

    const entry = document.createElement('div');
    const blockCls = type === 'out' ? 'log-block-out' : (type === 'in' ? 'log-block-in' : '');
    entry.className = `log-entry ${blockCls}`;
    const cls = type === 'in' ? 'log-in' : (type === 'out' ? 'log-out' : 'log-err');
    const t = new Date().toISOString().split('T')[1].slice(0, 12);
    const arrow = type === 'out' ? '⬆' : (type === 'in' ? '⬇' : '⚙');

    let json = '';
    try {
        const clone = JSON.parse(JSON.stringify(data));
        // Truncate audio data for readability
        if (clone.realtimeInput && clone.realtimeInput.mediaChunks) {
            clone.realtimeInput.mediaChunks.forEach(c => {
                if (c.data && c.data.length > 50) c.data = `[AUDIO ${c.data.length}b]`;
            });
        }
        json = JSON.stringify(clone, null, 2);
    } catch { json = String(data); }

    entry.innerHTML = `<span class="log-time">[${t}]</span> ${arrow} <span class="${cls}">${source}:</span> ${json.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}`;
    ui.logArea.appendChild(entry);
    if (ui.autoScroll && ui.autoScroll.checked) ui.logArea.scrollTop = ui.logArea.scrollHeight;
}


// ═══════════════════════════════════════════════════════════════════════
//  AUDIO CAPTURE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Start capturing audio from the given MediaStream.
 * - Downsamples to 16kHz PCM (Int16)
 * - Calculates RMS to set the `isSpeaking` flag
 * - Sends base64-encoded audio frames over the active WebSocket
 */
function startAudioCapture(stream) {
    mediaStream = stream;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);

    // Analyser for waveform visualization
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    source.connect(analyserNode);

    // ScriptProcessor for PCM extraction
    processorNode = audioContext.createScriptProcessor(AUDIO_CHUNK_SIZE, 1, 1);
    source.connect(processorNode);
    processorNode.connect(audioContext.destination); // Required for processor to fire

    const inputSampleRate = audioContext.sampleRate;
    const downsampleRatio = inputSampleRate / TARGET_SAMPLE_RATE;

    processorNode.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // ── RMS volume → speaking detection ──
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        isSpeaking = rms > SPEAKING_RMS_THRESHOLD;

        // ── Downsample to 16kHz ──
        const outputLength = Math.floor(inputData.length / downsampleRatio);
        const pcm16 = new Int16Array(outputLength);
        for (let i = 0; i < outputLength; i++) {
            const srcIndex = Math.floor(i * downsampleRatio);
            let sample = Math.max(-1, Math.min(1, inputData[srcIndex]));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // ── Send as base64-encoded PCM over WebSocket ──
        const base64Audio = arrayBufferToBase64(pcm16.buffer);
        ws.send(JSON.stringify({
            realtimeInput: {
                mediaChunks: [{
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64Audio
                }]
            }
        }));
    };

    logToConsole('Audio', {
        status: 'Capture started',
        inputSampleRate,
        targetSampleRate: TARGET_SAMPLE_RATE,
        downsampleRatio: downsampleRatio.toFixed(2),
        chunkSize: AUDIO_CHUNK_SIZE
    });
}

function stopAudioCapture() {
    if (processorNode) { processorNode.disconnect(); processorNode = null; }
    if (analyserNode) { analyserNode.disconnect(); analyserNode = null; }
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    isSpeaking = false;
}


// ═══════════════════════════════════════════════════════════════════════
//  TOOL CALL HANDLER
// ═══════════════════════════════════════════════════════════════════════

function handleToolCall(tc) {
    const { name, args } = tc;

    switch (name) {
        case 'update_zopa': {
            if (args.framework_label) ui.strategyTitle.textContent = args.framework_label.toUpperCase();
            let changed = false;
            if (args.client_anchor) { ui.valClientAnchor.textContent = args.client_anchor; changed = true; }
            if (args.your_target)   { ui.valYourTarget.textContent = args.your_target; changed = true; }
            if (args.zopa_range)    { ui.valZopa.textContent = args.zopa_range; changed = true; }
            if (changed) ui.batnaDetails.classList.add('visible');
            break;
        }

        case 'update_analytics': {
            if (args.phase) ui.phaseBadge.setAttribute('data-raw-phase', args.phase);
            const lang = document.documentElement.lang || 'en';
            const t = translations[lang];
            if (args.phase) {
                const lowerPhase = args.phase.toLowerCase();
                const matchedKey = Object.keys(translations.en.agenda).find(k => translations.en.agenda[k].toLowerCase() === lowerPhase);
                if (matchedKey && t && t.agenda[matchedKey]) {
                    ui.phaseBadge.textContent = t.agenda[matchedKey].toUpperCase();
                } else {
                    ui.phaseBadge.textContent = args.phase.toUpperCase();
                }
            }
            if (args.talk_ratio_client !== undefined) {
                ui.ratioClient.textContent = `${t ? t.roles.client : 'CLIENT'}  ${args.talk_ratio_client}%`;
            }
            if (args.talk_ratio_you !== undefined) {
                ui.ratioYou.textContent = `${t ? t.roles.you : 'YOU'}  ${args.talk_ratio_you}%`;
            }
            break;
        }

        case 'suggest_directive': {
            if (args.text) {
                ui.hintBox.classList.remove('active', 'active-blue');
                ui.hintBox.classList.add(args.urgency === 'high' ? 'active' : 'active-blue');
                ui.hintText.textContent = args.text;
            }
            break;
        }

        case 'show_battlecard': {
            ui.prosConsPanel.classList.add('open');
            ui.prosConsPanel.querySelector('.panel-title').textContent = `⚡ ${args.title}`;
            let html = '';
            if (args.pros) args.pros.forEach(p => html += `<div class="pro-item">${p}</div>`);
            if (args.cons) args.cons.forEach(c => html += `<div class="con-item">${c}</div>`);
            ui.prosConsContent.innerHTML = html;
            break;
        }

        case 'add_trigger': {
            const pill = document.createElement('div');
            pill.className = 'event-pill';
            pill.innerHTML = `<span class="event-time">${formatTime(sessionSeconds)}</span><span>${args.label}</span>`;
            ui.timeline.appendChild(pill);
            ui.timeline.parentElement.scrollLeft = ui.timeline.parentElement.scrollWidth;
            break;
        }

        default:
            logToConsole('ToolCall', { warning: `Unknown tool: ${name}`, args }, 'err');
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  SESSION MANAGEMENT (WebSocket lifecycle)
// ═══════════════════════════════════════════════════════════════════════

async function startSession() {
    const apiKey = ui.apiKeyInput.value.trim();
    if (!apiKey) { alert('Please enter a Gemini API Key'); return; }
    localStorage.setItem('gemini_api_key', apiKey);

    // Reset state for a fresh session (no resume)
    sessionLog = [];
    sessionStartTime = new Date().toISOString().replace(/[:.]/g, '-');

    // UI → connecting
    ui.sessionBtn.disabled = true;
    const t = translations[document.documentElement.lang || 'en'];
    ui.sessionBtn.innerHTML = `<span style="animation: pulse-dot 1s infinite">●</span> ${t ? t.ui.connecting : 'CONNECTING...'}`;

    try {
        // 1. Capture media stream
        logToConsole('System', { status: 'Requesting media access...' });
        const audioSource = document.getElementById('preset-select')?.value || 'microphone';
        let stream;
        if (audioSource === 'system_audio') {
            // Try getDisplayMedia for system audio (requires user gesture)
            try {
                stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
            } catch {
                logToConsole('System', { info: 'System audio unavailable, falling back to microphone' });
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }
        } else {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
        logToConsole('Audio', { status: 'Media stream acquired' });

        // 2. Open WebSocket — fresh connection, no session resumption
        const wsUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
        logToConsole('Gemini', { action: 'Opening fresh WebSocket (no session resume)...' }, 'out');

        let setupResolve, setupReject;
        const setupPromise = new Promise((resolve, reject) => {
            setupResolve = resolve;
            setupReject = reject;
        });

        ws = new WebSocket(wsUrl);

        // Connection timeout
        const timeout = setTimeout(() => {
            const errParam = `Connection timeout (${CONNECTION_TIMEOUT_MS / 1000}s) — no setupComplete received`;
            logToConsole('Gemini', { error: errParam }, 'err');
            ws.close();
            setupReject(new Error(errParam));
            stopSession();
        }, CONNECTION_TIMEOUT_MS);

        ws.onopen = () => {
            logToConsole('Gemini', { status: 'WebSocket upgraded (101). Sending setup...' });

            // ── Send BidiGenerateContentSetup ──
            const setupPayload = {
                setup: {
                    model: MODEL_ID,
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                    tools: [{ functionDeclarations: toolDeclarations }],
                    generationConfig: {
                        responseModalities: ['AUDIO']
                    }
                }
            };
            logToConsole('Client (Setup)', setupPayload, 'out');
            ws.send(JSON.stringify(setupPayload));
        };

        ws.onmessage = (event) => {
            let data;
            try { data = JSON.parse(event.data); }
            catch { logToConsole('Parse Error', event.data, 'err'); return; }

            logToConsole('Gemini', data, 'in');

            // ── setupComplete → resolve promise ──
            if (data.setupComplete) {
                clearTimeout(timeout);
                setupResolve();
                return;
            }

            // ── serverContent → route tool calls ──
            if (data.serverContent) {
                const turn = data.serverContent.modelTurn;
                if (turn && turn.parts) {
                    const calls = [];
                    turn.parts.forEach(part => {
                        if (part.functionCall) {
                            calls.push(part.functionCall);
                            handleToolCall(part.functionCall);
                        }
                    });
                    // Send tool responses when turn is complete
                    if (data.serverContent.turnComplete && calls.length > 0) {
                        const responsePayload = {
                            toolResponse: {
                                functionResponses: calls.map(c => ({
                                    id: c.id,
                                    name: c.name,
                                    response: { output: { success: true } }
                                }))
                            }
                        };
                        logToConsole('Client (Tool Response)', responsePayload, 'out');
                        ws.send(JSON.stringify(responsePayload));
                    }
                }
            }
        };

        ws.onerror = (err) => {
            clearTimeout(timeout);
            logToConsole('Gemini', { error: 'WebSocket Error', detail: String(err) }, 'err');
            stopSession();
        };

        ws.onclose = (event) => {
            clearTimeout(timeout);
            logToConsole('Gemini', { status: `Closed (code=${event.code}, reason=${event.reason || 'none'})` });
            if (isSessionActive) stopSession();
        };

        // 3. Wait for setupComplete before starting audio transmission
        await setupPromise;
        startAudioCapture(stream);
        onSessionConnected();

    } catch (err) {
        console.error(err);
        logToConsole('System', { error: err.message }, 'err');
        stopSession();
    }
}

/** Called when setupComplete is received — session is fully live */
function onSessionConnected() {
    isSessionActive = true;

    ui.statusDot.className = 'status-dot live';
    const t = translations[document.documentElement.lang || 'en'];
    ui.statusText.textContent = t ? t.ui.live : 'LIVE';
    ui.statusText.style.color = 'var(--accent-green)';

    const tt = translations[document.documentElement.lang || 'en'];
    ui.sessionBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg> ${tt ? tt.ui.stopSession : 'STOP SESSION'}`;
    ui.sessionBtn.className = 'btn-danger';
    ui.sessionBtn.disabled = false;

    // Timer
    sessionSeconds = 0;
    ui.timerDisplay.textContent = '00:00';
    timerInterval = setInterval(() => {
        sessionSeconds++;
        ui.timerDisplay.textContent = formatTime(sessionSeconds);
    }, 1000);

    // Reset UI
    ui.timeline.innerHTML = '';
    ui.phaseBadge.setAttribute('data-raw-phase', 'LISTENING...');
    const tL = translations[document.documentElement.lang || 'en'];
    ui.phaseBadge.textContent = tL ? tL.ui.listening : 'LISTENING...';
}

function stopSession() {
    // Close WebSocket
    if (ws) {
        try { ws.close(); } catch {}
        ws = null;
    }

    // Stop audio
    stopAudioCapture();

    isSessionActive = false;
    clearInterval(timerInterval);

    // Auto-download session log
    if (sessionLog.length > 0) {
        logToConsole('System', { status: `Session ended. ${sessionLog.length} log entries.` });
        downloadSessionLog();
    }

    // UI → offline
    ui.statusDot.className = 'status-dot';
    const tO = translations[document.documentElement.lang || 'en'];
    ui.statusText.textContent = tO ? tO.ui.offline : 'Offline';
    ui.statusText.style.color = 'var(--text-secondary)';
    ui.sessionBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ${tO ? tO.ui.startSession : 'START SESSION'}`;
    ui.sessionBtn.className = 'btn-primary';
    ui.sessionBtn.disabled = false;
}

function toggleSession() {
    if (isSessionActive) {
        stopSession();
    } else {
        startSession();
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  WAVEFORM VISUALIZER
// ═══════════════════════════════════════════════════════════════════════

function initAudioCanvas() {
    const cvs = ui.audioCanvas;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    let dataArray;

    function draw() {
        requestAnimationFrame(draw);
        const w = cvs.clientWidth, h = cvs.clientHeight;
        if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
        ctx.clearRect(0, 0, w, h);

        if (!analyserNode || !isSessionActive) {
            // Flatline
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(77, 124, 255, 0)');
            grad.addColorStop(0.5, 'rgba(77, 124, 255, 0.3)');
            grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
            ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
            ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.stroke();
            return;
        }

        if (!dataArray) dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteTimeDomainData(dataArray);

        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#00d4ff');
        grad.addColorStop(0.5, '#4d7cff');
        grad.addColorStop(1, '#a855f7');

        ctx.beginPath();
        const sliceW = w / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * h) / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            x += sliceW;
        }
        ctx.lineTo(w, h / 2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = isSpeaking ? 4 : 2;
        ctx.shadowColor = isSpeaking ? '#00e676' : '#00d4ff';
        ctx.shadowBlur = isSpeaking ? 20 : 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Thinner overlay
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    draw();
}


// ═══════════════════════════════════════════════════════════════════════
//  PARTICLE BACKGROUND
// ═══════════════════════════════════════════════════════════════════════

function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const COUNT = 60;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
            this.hue = Math.random() > 0.5 ? 200 : 270;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(77, 124, 255, ${0.06 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
}


// ═══════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
    cacheDom();

    // Restore API key
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) ui.apiKeyInput.value = savedKey;

    // Wire buttons
    ui.sessionBtn.addEventListener('click', toggleSession);
    ui.devConsoleToggle.addEventListener('click', () => ui.devConsolePanel.classList.toggle('open'));

    // Start visual loops
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
        setLanguage(langSelect.value);
    }
    
    initAudioCanvas();
    initParticles();
});
