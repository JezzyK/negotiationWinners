import sys
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update the call-meta section with new buttons
old_meta = """    <div class="live"><div class="live-dot"></div>Live</div>
    <div class="timer" id="timer">21:30</div>
    <div class="badge">MEDDICC</div>"""

new_meta = """    <select id="audio-src" style="font-size:11px; padding:4px 8px; border-radius:4px; background:var(--surface); color:var(--text); border:1px solid var(--border); outline:none; appearance:none;">
      <option value="system">🖥 System Audio</option>
      <option value="mic">🎤 Microphone</option>
    </select>
    <button id="btn-session" style="font-size:11px; padding:6px 14px; border-radius:5px; border:none; background:var(--blue); color:white; font-weight:600; cursor:pointer; transition:0.2s;">🎙 Start Session</button>
    <div class="live" id="status-ind" style="color:var(--muted); gap: 6px;"><div class="live-dot" id="status-dot" style="background:var(--muted); animation:none;"></div><span id="status-text">Idle</span></div>
    <div class="timer" id="timer">00:00</div>
    <div class="badge">MEDDICC</div>"""

html = html.replace(old_meta, new_meta)

# 2. Add an ID to the trigger log to allow appending easily
html = html.replace('<div class="trigger-log">', '<div class="trigger-log" id="trigger-log">')
html = html.replace('<div class="trigger-log" id="trigger-log">\n      <div class="trig fresh" data-i18n="trig1">⚡ Competitor: SAP · 14:14</div>', '<div class="trigger-log" id="trigger-log">\n      <!-- Triggers injected here -->\n      <div class="trig fresh" data-i18n="trig1">⚡ Competitor: SAP · 14:14</div>')

# 3. Replace script linking
html = re.sub(r'<script>.*?</script>', '<script src="app.js"></script>', html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Patching done!")
