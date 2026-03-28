const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add data-i18n attributes
html = html.replace('<span id="status-text" style="color: var(--text-secondary)">Offline</span>', '<span id="status-text" style="color: var(--text-secondary)" data-i18n="ui.offline">Offline</span>');
html = html.replace('<span class="panel-title">⚡ Context Insights</span>', '<span class="panel-title" data-i18n="ui.contextInsights">⚡ Context Insights</span>');
html = html.replace('<div style="color: var(--text-muted); font-style: italic; font-size: 13px; text-align: center; margin-top: 40px;">\n                    Awaiting context triggers...\n                </div>', '<div style="color: var(--text-muted); font-style: italic; font-size: 13px; text-align: center; margin-top: 40px;" data-i18n="ui.awaitingContext">\n                    Awaiting context triggers...\n                </div>');
// Also fallback if line breaks are different:
html = html.replace(/<div style="color: var\(--text-muted\); font-style: italic; font-size: 13px; text-align: center; margin-top: 40px;">[\s]*Awaiting context triggers...[\s]*<\/div>/, '<div style="color: var(--text-muted); font-style: italic; font-size: 13px; text-align: center; margin-top: 40px;" data-i18n="ui.awaitingContext">\n                    Awaiting context triggers...\n                </div>');

html = html.replace('<div class="detail-label">Client Anchor</div>', '<div class="detail-label" data-i18n="battlecard.clientAnchor">Client Anchor</div>');
html = html.replace('<div class="detail-label">Your Target</div>', '<div class="detail-label" data-i18n="battlecard.yourTarget">Your Target</div>');
html = html.replace('<div class="detail-label">ZOPA</div>', '<div class="detail-label" data-i18n="battlecard.zopa">ZOPA</div>');
html = html.replace('<div class="hint-label">💡 What to Say</div>', '<div class="hint-label" data-i18n="ui.hintBox">💡 What to Say</div>');
html = html.replace('<div id="hint-text" class="hint-text">Waiting for negotiation context…</div>', '<div id="hint-text" class="hint-text" data-i18n="ui.waitingHint">Waiting for negotiation context…</div>');
html = html.replace('<div class="timeline-label">📌 Key Events</div>', '<div class="timeline-label" data-i18n="ui.keyEvents">📌 Key Events</div>');
html = html.replace('<span class="panel-title">🖥️ Developer Console</span>', '<span class="panel-title" data-i18n="ui.devConsole">🖥️ Developer Console</span>');

// 2. Insert JS translations and setLanguage after <script>
const jsToInsert = `
        // ─── Translations ───
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

            if (ui && ui.ratioClient) {
                const clientMatch = ui.ratioClient.textContent.match(/(\d+%|—%)/);
                const clientPct = clientMatch ? clientMatch[0] : '—%';
                ui.ratioClient.textContent = \`\${t.roles.client}  \${clientPct}\`;
            }
            if (ui && ui.ratioYou) {
                const youMatch = ui.ratioYou.textContent.match(/(\d+%|—%)/);
                const youPct = youMatch ? youMatch[0] : '—%';
                ui.ratioYou.textContent = \`\${t.roles.you}  \${youPct}\`;
            }

            if (ui && ui.phaseBadge) {
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
                if (isConnected) ui.statusText.textContent = t.ui.live;
                else ui.statusText.textContent = t.ui.offline;
            }

            if (ui && ui.sessionBtn) {
                if (isConnected) {
                    ui.sessionBtn.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg> \${t.ui.stopSession}\`;
                } else if (ui.sessionBtn.disabled) {
                    ui.sessionBtn.innerHTML = \`<span style="animation: pulse-dot 1s infinite">●</span> \${t.ui.connecting}\`;
                } else {
                    ui.sessionBtn.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> \${t.ui.startSession}\`;
                }
            }
        }`;

if (!html.includes('const translations = {')) {
    html = html.replace('<script>', '<script>\n' + jsToInsert);
}

// 3. Inject event listener
if (!html.includes('const langSelect = document.getElementById(\'lang-select\');')) {
    html = html.replace('initAudioCanvas();', `const langSelect = document.getElementById('lang-select');
            if (langSelect) {
                langSelect.addEventListener('change', (e) => {
                    setLanguage(e.target.value);
                });
                setLanguage(langSelect.value);
            }

            initAudioCanvas();`);
}

// 4. Update JS logic to use translation in handles
html = html.replace('if (args.phase) ui.phaseBadge.textContent = args.phase.toUpperCase();', `if (args.phase) {
                    ui.phaseBadge.setAttribute('data-raw-phase', args.phase);
                    const lang = document.documentElement.lang || 'en';
                    const t = translations[lang];
                    const lowerPhase = args.phase.toLowerCase();
                    const matchedKey = Object.keys(translations.en.agenda).find(k => translations.en.agenda[k].toLowerCase() === lowerPhase);
                    if (matchedKey && t && t.agenda[matchedKey]) {
                        ui.phaseBadge.textContent = t.agenda[matchedKey].toUpperCase();
                    } else {
                        ui.phaseBadge.textContent = args.phase.toUpperCase();
                    }
                }`);

html = html.replace('if (args.talk_ratio_client !== undefined) ui.ratioClient.textContent = `CLIENT  ${args.talk_ratio_client}%`;', 
`if (args.talk_ratio_client !== undefined) {
                    const t = translations[document.documentElement.lang || 'en'];
                    ui.ratioClient.textContent = \`\${t ? t.roles.client : 'CLIENT'}  \${args.talk_ratio_client}%\`;
                }`
);

html = html.replace('if (args.talk_ratio_you !== undefined) ui.ratioYou.textContent = `YOU  ${args.talk_ratio_you}%`;',
`if (args.talk_ratio_you !== undefined) {
                    const t = translations[document.documentElement.lang || 'en'];
                    ui.ratioYou.textContent = \`\${t ? t.roles.you : 'YOU'}  \${args.talk_ratio_you}%\`;
                }`
);

html = html.replace('ui.sessionBtn.innerHTML = `<span style="animation: pulse-dot 1s infinite">●</span> CONNECTING...`;',
`const t = translations[document.documentElement.lang || 'en'];
            ui.sessionBtn.innerHTML = \`<span style="animation: pulse-dot 1s infinite">●</span> \${t ? t.ui.connecting : 'CONNECTING...'}\`;`
);

html = html.replace("ui.statusText.textContent = 'LIVE';",
`const t = translations[document.documentElement.lang || 'en'];
            ui.statusText.textContent = t ? t.ui.live : 'LIVE';`
);

html = html.replace('ui.sessionBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg> STOP SESSION`;',
`const tt = translations[document.documentElement.lang || 'en'];
            ui.sessionBtn.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg> \${tt ? tt.ui.stopSession : 'STOP SESSION'}\`;`
);

html = html.replace("ui.phaseBadge.textContent = 'LISTENING...';",
`ui.phaseBadge.setAttribute('data-raw-phase', 'LISTENING...');
            const tL = translations[document.documentElement.lang || 'en'];
            ui.phaseBadge.textContent = tL ? tL.ui.listening : 'LISTENING...';`
);

html = html.replace("ui.statusText.textContent = 'Offline';",
`const tO = translations[document.documentElement.lang || 'en'];
            ui.statusText.textContent = tO ? tO.ui.offline : 'Offline';`
);

html = html.replace('ui.sessionBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> START SESSION`;',
`ui.sessionBtn.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> \${tO ? tO.ui.startSession : 'START SESSION'}\`;`
);

// One more check for the sessionBtn element without translations
html = html.replace(/<button id="session-btn" class="btn-primary">\s*<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"><\/polygon><\/svg>\s*START SESSION\s*<\/button>/g, '<button id="session-btn" class="btn-primary">\n                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>\n                <span data-i18n="ui.startSession">START SESSION</span>\n            </button>');

fs.writeFileSync('index.html', html);
console.log('done');
