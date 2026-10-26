// PlaceX Live AI Mock Interview Console (100% Visual Parity with Localhost Pipecat Client)
export function getAvatarHtml(company = "Target Company", role = "Software Engineer") {
  const safeCompany = company.replace(/"/g, '&quot;');
  const safeRole = role.replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlaceX Live Interview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #090D15;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* 1. TOP HEADER (PlaceX Live Interview + Controls) */
    .runner-header {
      height: 44px;
      background: #0D111A;
      border-bottom: 1px solid #192231;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      flex-shrink: 0;
      user-select: none;
    }
    .runner-header .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-title {
      font-size: 13px;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: -0.01em;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .transport-pill {
      background: #141B26;
      border: 1px solid #233044;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #CBD5E1;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: #94A3B8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .icon-btn:hover {
      background: #16202E;
      color: #F8FAFC;
      border-color: #233044;
    }
    .disconnect-btn {
      background: #991B1B;
      border: 1px solid #B91C1C;
      color: #FEE2E2;
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .disconnect-btn:hover {
      background: #DC2626;
      color: #FFFFFF;
    }

    /* 2. MAIN 3-COLUMN GRID */
    .runner-body {
      flex: 1;
      display: grid;
      grid-template-columns: 1.15fr 1fr 180px;
      gap: 8px;
      padding: 8px;
      overflow: hidden;
      min-height: 0;
    }

    /* Column 1: Bot Video, Bot Audio, Events */
    .col-left {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
      overflow: hidden;
    }

    .card {
      background: #0E131E;
      border: 1px solid #1A2433;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .card-header {
      height: 28px;
      background: #111827;
      border-bottom: 1px solid #1A2433;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94A3B8;
      flex-shrink: 0;
    }

    /* Bot Video Container: Perfect 16:9 / 4:3 with zero weird cropping */
    .bot-video-card {
      flex: 1.25;
      min-height: 190px;
      position: relative;
    }
    .bot-video-viewport {
      flex: 1;
      position: relative;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #simli-video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000000;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    #simli-video.active {
      opacity: 1;
    }
    .video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #64748B;
      background: #07090F;
      transition: opacity 0.3s ease;
    }
    .video-placeholder.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .video-placeholder svg {
      width: 26px;
      height: 26px;
      opacity: 0.7;
    }
    .video-placeholder span {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
    }

    /* Bot Audio Container: 8 Pulsing Blue Dots */
    .bot-audio-card {
      height: 96px;
      flex-shrink: 0;
    }
    .audio-dots-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      background: #0A0D15;
    }
    .audio-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #3B82F6;
      box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
      transition: all 0.18s ease;
      opacity: 0.6;
    }
    .audio-dot.pulse {
      background: #60A5FA;
      box-shadow: 0 0 12px #60A5FA;
      transform: scale(1.4);
      opacity: 1;
    }

    /* Events Panel: Collapsible Bar */
    .events-card {
      height: 72px;
      flex-shrink: 0;
    }
    .events-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 6px 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      line-height: 1.45;
      color: #94A3B8;
      background: #080B12;
    }
    .event-line {
      display: flex;
      gap: 8px;
    }
    .event-line .time { color: #64748B; }
    .event-line .tag { color: #38BDF8; font-weight: 700; }
    .event-line .msg { color: #CBD5E1; }

    /* Column 2: Conversation + Input */
    .col-center {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .convo-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .tab-bar {
      height: 32px;
      background: #111827;
      border-bottom: 1px solid #1A2433;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
      flex-shrink: 0;
    }
    .tab-btn {
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #94A3B8;
      background: transparent;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tab-btn.active {
      color: #F8FAFC;
      background: #1A2433;
    }
    .convo-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #0A0D15;
    }
    .msg-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .msg-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .msg-header.user { color: #38BDF8; }
    .msg-header.bot { color: #34D399; }
    .msg-header .time { color: #64748B; font-weight: 400; text-transform: none; }
    .msg-body {
      font-size: 12px;
      line-height: 1.5;
      color: #F1F5F9;
      background: #101623;
      border: 1px solid #1F2A3C;
      padding: 8px 10px;
      border-radius: 6px;
      margin-top: 3px;
    }
    .convo-input-row {
      height: 40px;
      background: #0E131E;
      border-top: 1px solid #1A2433;
      display: flex;
      align-items: center;
      padding: 0 8px;
      gap: 6px;
      flex-shrink: 0;
    }
    .convo-input {
      flex: 1;
      height: 28px;
      background: #141B26;
      border: 1px solid #233044;
      border-radius: 6px;
      padding: 0 10px;
      color: #F8FAFC;
      font-size: 11px;
      outline: none;
    }
    .convo-input::placeholder { color: #64748B; }
    .convo-send-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #1E293B;
      border: 1px solid #334155;
      color: #CBD5E1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    /* Column 3: Status Sidebar */
    .col-right {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 10px;
      background: #0B0F18;
      border: 1px solid #1A2433;
      border-radius: 8px;
      font-size: 11px;
      overflow-y: auto;
    }
    .status-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .status-heading {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748B;
      margin-bottom: 2px;
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #94A3B8;
      font-size: 11px;
    }
    .status-row .ready {
      color: #22C55E;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .device-buttons {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .device-btn {
      height: 30px;
      background: #111722;
      border: 1px solid #1F2A3B;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #CBD5E1;
      cursor: pointer;
      font-size: 11px;
    }
    .device-btn.muted {
      background: rgba(185, 28, 28, 0.15);
      border-color: #991B1B;
      color: #EF4444;
    }
    .session-meta-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
    }
    .session-meta-row .label {
      font-size: 10px;
      color: #64748B;
    }
    .session-meta-row .val-box {
      background: #111722;
      border: 1px solid #1F2A3B;
      border-radius: 4px;
      padding: 3px 6px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 10px;
      color: #CBD5E1;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- Top Runner Header -->
  <header class="runner-header">
    <div class="brand">
      <div class="brand-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 18V6l8 8 8-8v12"/>
        </svg>
      </div>
      <span class="brand-title">PlaceX Live Interview</span>
    </div>

    <div class="header-actions">
      <div class="transport-pill">
        <span>SmallWebRTC</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>

      <button class="icon-btn" title="Toggle theme">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      </button>

      <button class="icon-btn" title="Audio controls">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </button>

      <button class="icon-btn" title="Layout options">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
      </button>

      <button class="disconnect-btn" id="disconnect-btn">Disconnect</button>
    </div>
  </header>

  <!-- Main 3-Column Body -->
  <main class="runner-body">

    <!-- Left Column: Video, Audio, Events -->
    <section class="col-left">
      <!-- Bot Video Card -->
      <div class="card bot-video-card">
        <div class="card-header">
          <span>BOT VIDEO</span>
        </div>
        <div class="bot-video-viewport">
          <video id="simli-video" playsinline autoplay muted></video>
          <div class="video-placeholder" id="video-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 16 3-3V7a2 2 0 0 0-2-2H7m-4 0v14a2 2 0 0 0 2 2h14"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
            <span>No video</span>
          </div>
        </div>
      </div>

      <!-- Bot Audio Card -->
      <div class="card bot-audio-card">
        <div class="card-header">
          <span>BOT AUDIO</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        </div>
        <div class="audio-dots-wrap" id="audio-dots">
          <span class="audio-dot"></span>
          <span class="audio-dot"></span>
          <span class="audio-dot"></span>
          <span class="audio-dot"></span>
          <span class="audio-dot"></span>
          <span class="audio-dot"></span>
          <span class="audio-dot"></span>
          <span class="audio-dot"></span>
        </div>
      </div>

      <!-- Events Card -->
      <div class="card events-card">
        <div class="card-header">
          <span>EVENTS</span>
          <span style="font-size: 9px; color: #64748B;">Filter...</span>
        </div>
        <div class="events-scroll" id="events-log">
          <div class="event-line">
            <span class="time">00:00:01</span>
            <span class="tag">[webrtc]</span>
            <span class="msg">SmallWebRTC client initialized</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Center Column: Conversation -->
    <section class="col-center">
      <div class="card convo-card">
        <div class="tab-bar">
          <button class="tab-btn active">Conversation</button>
          <button class="tab-btn">Metrics</button>
          <button class="tab-btn">
            <span>karaoke</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>

        <div class="convo-messages" id="convo-messages">
          <div class="msg-block">
            <div class="msg-header bot">
              <span>AI Interviewer</span>
              <span class="time" id="init-time">7:35:00 PM</span>
            </div>
            <div class="msg-body" id="convo-first-q">
              Initializing live interview session for ${safeCompany}...
            </div>
          </div>
        </div>

        <div class="convo-input-row">
          <input type="text" class="convo-input" id="chat-input" placeholder="Type message..." />
          <button class="convo-send-btn" id="chat-send" title="Send message">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Right Column: Status Sidebar -->
    <aside class="col-right">
      <div class="status-section">
        <div class="status-heading">STATUS</div>
        <div class="status-row">
          <span>Client</span>
          <span class="ready" id="status-client">READY</span>
        </div>
        <div class="status-row">
          <span>Agent</span>
          <span class="ready" id="status-agent">READY</span>
        </div>
      </div>

      <div class="status-section">
        <div class="status-heading">DEVICES</div>
        <div class="device-buttons">
          <button class="device-btn" title="Microphone">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            <span style="letter-spacing: 2px; color: #22C55E; font-size: 8px;">•••••</span>
          </button>

          <button class="device-btn muted" title="Camera muted">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 16 3-3V7a2 2 0 0 0-2-2H7m-4 0v14a2 2 0 0 0 2 2h14"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          </button>

          <button class="device-btn" title="Share Screen">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>
        </div>
      </div>

      <div class="status-section">
        <div class="status-heading">SESSION</div>
        <div class="session-meta-row">
          <span class="label">Transport</span>
          <div class="val-box"><span>SmallWebRTC</span></div>
        </div>
        <div class="session-meta-row">
          <span class="label">Session ID</span>
          <div class="val-box">
            <span id="session-id-txt">1</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </div>
        </div>
        <div class="session-meta-row">
          <span class="label">Participant ID</span>
          <div class="val-box">
            <span>usr_cand</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </div>
        </div>
      </div>
    </aside>
  </main>

  <audio id="bot-audio" preload="auto"></audio>

  <script>
    let peerConnection = null;
    let webSocket = null;
    let isSpeaking = false;
    let isMuted = false;
    let pulseInterval = null;
    let lastSpokenText = "";

    const videoEl = document.getElementById('simli-video');
    const videoPlaceholder = document.getElementById('video-placeholder');
    const audioEl = document.getElementById('bot-audio');
    const audioDots = document.querySelectorAll('.audio-dot');
    const eventsLog = document.getElementById('events-log');
    const convoMessages = document.getElementById('convo-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const disconnectBtn = document.getElementById('disconnect-btn');

    function getFormattedTime() {
      const d = new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    const initTimeEl = document.getElementById('init-time');
    if (initTimeEl) initTimeEl.textContent = getFormattedTime();

    function logEvent(tag, msg) {
      if (!eventsLog) return;
      const row = document.createElement('div');
      row.className = 'event-line';
      row.innerHTML = '<span class="time">' + getFormattedTime() + '</span><span class="tag">[' + tag + ']</span><span class="msg">' + msg + '</span>';
      eventsLog.appendChild(row);
      eventsLog.scrollTop = eventsLog.scrollHeight;
    }

    function emitParent(type, data) {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type, data }, '*');
        }
      } catch (e) {}
    }

    // Dot Waveform Animation
    function setAudioSpeaking(speaking) {
      isSpeaking = speaking;
      if (speaking) {
        if (!pulseInterval) {
          let step = 0;
          pulseInterval = setInterval(() => {
            audioDots.forEach((dot, idx) => {
              if (idx === step % audioDots.length || idx === (step + 1) % audioDots.length) {
                dot.classList.add('pulse');
              } else {
                dot.classList.remove('pulse');
              }
            });
            step++;
          }, 120);
        }
        logEvent('speech', 'Bot started speaking');
        emitParent('RTVI_BOT_SPEAKING');
      } else {
        if (pulseInterval) {
          clearInterval(pulseInterval);
          pulseInterval = null;
        }
        audioDots.forEach(d => d.classList.remove('pulse'));
        logEvent('speech', 'Bot finished speaking — ready for input');
        emitParent('RTVI_BOT_IDLE');
      }
    }

    // Add chat message bubble
    function addChatMessage(speaker, text) {
      if (!convoMessages || !text) return;
      const block = document.createElement('div');
      block.className = 'msg-block';
      const isUser = speaker.toLowerCase() === 'user';
      block.innerHTML = '<div class="msg-header ' + (isUser ? 'user' : 'bot') + '">' +
        '<span>' + (isUser ? 'user' : 'AI Interviewer') + '</span>' +
        '<span class="time">' + getFormattedTime() + '</span>' +
        '</div>' +
        '<div class="msg-body">' + text + '</div>';
      convoMessages.appendChild(block);
      convoMessages.scrollTop = convoMessages.scrollHeight;
    }

    // Play TTS Audio and stream PCM chunks to Simli for lip-sync & movement
    async function playQuestion(text) {
      if (!text || isMuted) return;
      if (lastSpokenText === text && isSpeaking) return;
      lastSpokenText = text;

      // Update question text in conversation panel
      const firstQ = document.getElementById('convo-first-q');
      if (firstQ && firstQ.textContent.includes('Initializing')) {
        firstQ.textContent = text;
      } else {
        addChatMessage('AI Interviewer', text);
      }

      setAudioSpeaking(true);

      try {
        const res = await fetch('/api/v1/interview/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (!res.ok) throw new Error('TTS status ' + res.status);

        const arrayBuf = await res.arrayBuffer();

        // 1. Send PCM chunks to Simli WebSocket for facial expressions & mouth lip-sync
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf.slice(0));
          const channelData = audioBuf.getChannelData(0);

          const int16 = new Int16Array(channelData.length);
          for (let i = 0; i < channelData.length; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            const bytes = new Uint8Array(int16.buffer);
            const chunkSize = 6000;
            for (let offset = 0; offset < bytes.length; offset += chunkSize) {
              const chunk = bytes.slice(offset, offset + chunkSize);
              webSocket.send(chunk);
            }
            logEvent('simli', 'Streamed ' + bytes.length + ' bytes PCM to Simli avatar');
          }
        } catch (simliErr) {
          console.warn('[Simli PCM error]', simliErr);
        }

        // 2. Play audio stream locally through bot-audio
        const blob = new Blob([arrayBuf], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        audioEl.src = blobUrl;
        audioEl.onended = () => {
          setAudioSpeaking(false);
          URL.revokeObjectURL(blobUrl);
        };
        audioEl.onerror = () => {
          setAudioSpeaking(false);
          URL.revokeObjectURL(blobUrl);
        };
        await audioEl.play();

      } catch (err) {
        logEvent('error', 'Audio playback error: ' + err.message);
        if ('speechSynthesis' in window && !isMuted) {
          const utt = new SpeechSynthesisUtterance(text);
          utt.onend = () => setAudioSpeaking(false);
          utt.onerror = () => setAudioSpeaking(false);
          window.speechSynthesis.speak(utt);
        } else {
          setAudioSpeaking(false);
        }
      }
    }

    // Connect to Simli WebRTC Video Stream
    async function initWebRTC() {
      logEvent('webrtc', 'Connecting to Simli WebRTC gateway...');
      try {
        const sessionRes = await fetch('/api/v1/interview/simli-session');
        const sessionData = await sessionRes.json();

        if (!sessionData.available || !sessionData.session_token) {
          logEvent('webrtc', 'Simli session token unavailable — audio mode active');
          emitParent('RTVI_CONNECTED');
          return;
        }

        const iceServers = sessionData.ice_servers && sessionData.ice_servers.length > 0 
          ? sessionData.ice_servers 
          : [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }];

        peerConnection = new RTCPeerConnection({ iceServers });
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
        peerConnection.addTransceiver('video', { direction: 'recvonly' });

        peerConnection.ontrack = (event) => {
          if (event.track.kind === 'video' && event.streams[0]) {
            videoEl.srcObject = event.streams[0];
            videoEl.play().catch(() => {});
            videoEl.classList.add('active');
            if (videoPlaceholder) videoPlaceholder.classList.add('hidden');
            logEvent('webrtc', 'Remote avatar video track attached (512x512)');
          }
        };

        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === 'connected') {
            logEvent('webrtc', 'SmallWebRTC P2P connection established');
            emitParent('RTVI_CONNECTED');
          }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const wsUrl = 'wss://api.simli.ai/compose/webrtc/p2p?enableSFU=true&session_token=' + encodeURIComponent(sessionData.session_token);
        webSocket = new WebSocket(wsUrl);

        webSocket.onopen = () => {
          logEvent('webrtc', 'WebSocket open, sending SDP offer');
          webSocket.send(JSON.stringify({
            sdp: peerConnection.localDescription.sdp,
            type: peerConnection.localDescription.type
          }));
        };

        webSocket.onmessage = async (msg) => {
          try {
            const answer = JSON.parse(msg.data);
            if (answer && answer.sdp) {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
              logEvent('webrtc', 'Remote SDP answer applied');
              emitParent('RTVI_CONNECTED');
            }
          } catch (e) {}
        };

        webSocket.onerror = (e) => {
          logEvent('webrtc', 'WebRTC signaling notice, fallback active');
          emitParent('RTVI_CONNECTED');
        };

      } catch (err) {
        logEvent('webrtc', 'WebRTC gateway notice: ' + err.message);
        emitParent('RTVI_CONNECTED');
      }
    }

    // Message handler from parent window
    window.addEventListener('message', (ev) => {
      if (!ev.data || typeof ev.data !== 'object') return;
      const type = ev.data.type;

      switch (type) {
        case 'PLACEX_SPEAK':
          if (ev.data.text) playQuestion(ev.data.text);
          break;

        case 'PLACEX_CONNECT':
          if (!peerConnection || peerConnection.connectionState !== 'connected') {
            initWebRTC();
          } else {
            emitParent('RTVI_CONNECTED');
          }
          break;

        case 'PLACEX_MUTE_SPEAKER':
          isMuted = !!ev.data.muted;
          if (isMuted && audioEl) {
            audioEl.pause();
            setAudioSpeaking(false);
          }
          break;

        case 'PLACEX_DISCONNECT':
          if (audioEl) audioEl.pause();
          setAudioSpeaking(false);
          if (peerConnection) {
            try { peerConnection.close(); } catch (e) {}
            peerConnection = null;
          }
          if (webSocket) {
            try { webSocket.close(); } catch (e) {}
            webSocket = null;
          }
          emitParent('RTVI_DISCONNECTED');
          break;
      }
    });

    // Chat input submit
    if (chatSend && chatInput) {
      chatSend.addEventListener('click', () => {
        const val = chatInput.value.trim();
        if (val) {
          addChatMessage('user', val);
          chatInput.value = '';
          emitParent('RTVI_USER_SPEAKING');
        }
      });
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          chatSend.click();
        }
      });
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        emitParent('RTVI_DISCONNECTED');
      });
    }

    window.addEventListener('load', () => {
      emitParent('RTVI_READY');
      setTimeout(initWebRTC, 200);
    });
  </script>
</body>
</html>`;
}
