// PlaceX Live AI Interviewer Connected Dashboard (Bot Video, Bot Audio, Conversation, Status, Events)
export function getAvatarHtml(company = "Target Company", role = "Software Engineer") {
  const safeCompany = company.replace(/"/g, '&quot;');
  const safeRole = role.replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlaceX AI Interviewer Console</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #090D16;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Top Sub-Bar */
    .top-subbar {
      height: 38px;
      background: #0D121F;
      border-bottom: 1px solid #1E2538;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 11px;
      font-weight: 600;
      color: #94A3B8;
      flex-shrink: 0;
    }
    .top-subbar .left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .top-subbar .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34D399;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      font-mono: monospace;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 6px #34D399;
    }
    .badge-dot.connecting {
      background: #F59E0B;
      box-shadow: 0 0 6px #F59E0B;
    }

    /* Main Grid Layout */
    .dashboard-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 12px;
      padding: 12px;
      overflow: hidden;
      min-height: 0;
    }

    /* Left / Center Panels Stack */
    .main-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      min-height: 0;
      padding-right: 2px;
    }

    /* Media Panels Row (Compact Bot Video + Bot Audio) */
    .media-row {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 12px;
      min-height: 220px;
    }

    /* Reusable Panel Card Styling */
    .panel-card {
      background: #0E1422;
      border: 1px solid #1E273A;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .panel-header {
      height: 34px;
      background: #12192A;
      border-bottom: 1px solid #1E273A;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #CBD5E1;
      flex-shrink: 0;
    }
    .panel-header .indicator {
      font-size: 10px;
      font-family: monospace;
      color: #34D399;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .panel-content {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Compact Bot Video Container */
    .bot-video-container {
      width: 100%;
      height: 100%;
      min-height: 180px;
      background: #070A12;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    #simli-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    #simli-video.active {
      opacity: 1;
    }

    /* Fallback Orb inside Bot Video Panel */
    .compact-orb-wrap {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
      transition: opacity 0.4s ease;
    }
    .compact-orb-wrap.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .compact-orb {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #34D399, #059669 60%, #064E3B 100%);
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .compact-orb-core {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #0A0E18;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.6);
    }
    .compact-orb-text {
      margin-top: 8px;
      font-size: 11px;
      font-weight: 600;
      color: #94A3B8;
    }

    /* Bot Audio Visualizer Panel */
    .audio-visualizer-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #0B101C;
    }
    .waveform-bars {
      display: flex;
      gap: 5px;
      align-items: center;
      height: 46px;
    }
    .bar {
      width: 5px;
      background: #334155;
      border-radius: 3px;
      height: 8px;
      transition: height 0.15s ease, background-color 0.2s ease;
    }
    .bar.speaking {
      background: #34D399;
      animation: waveBar 1.2s ease-in-out infinite alternate;
    }
    .bar:nth-child(1) { animation-delay: 0.1s; }
    .bar:nth-child(2) { animation-delay: 0.3s; }
    .bar:nth-child(3) { animation-delay: 0.5s; }
    .bar:nth-child(4) { animation-delay: 0.2s; }
    .bar:nth-child(5) { animation-delay: 0.4s; }
    .bar:nth-child(6) { animation-delay: 0.25s; }
    .bar:nth-child(7) { animation-delay: 0.15s; }

    @keyframes waveBar {
      0% { height: 8px; }
      100% { height: 40px; }
    }

    .audio-meta {
      margin-top: 12px;
      font-size: 11px;
      color: #94A3B8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .audio-meta span.active {
      color: #34D399;
      font-weight: 700;
    }

    /* Conversation Panel */
    .conversation-panel {
      min-height: 160px;
      max-height: 220px;
    }
    .convo-list {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      height: 100%;
    }
    .chat-bubble {
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.5;
    }
    .chat-bubble.bot {
      background: #141C2C;
      border: 1px solid #243046;
      color: #F1F5F9;
      align-self: flex-start;
      max-width: 90%;
    }
    .chat-bubble.bot .speaker {
      font-size: 10px;
      font-weight: 800;
      color: #34D399;
      text-transform: uppercase;
      font-family: monospace;
      margin-bottom: 3px;
    }
    .chat-bubble.user {
      background: #1A2538;
      border: 1px solid #2F3E58;
      color: #E2E8F0;
      align-self: flex-end;
      max-width: 85%;
    }

    /* Events Panel */
    .events-panel {
      min-height: 130px;
      max-height: 180px;
    }
    .events-list {
      padding: 8px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      overflow-y: auto;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #080C14;
    }
    .event-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748B;
    }
    .event-row .time { color: #475569; }
    .event-row .tag {
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .event-row.info .tag { background: #1E293B; color: #94A3B8; }
    .event-row.speech .tag { background: rgba(16, 185, 129, 0.15); color: #34D399; }
    .event-row.webrtc .tag { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }

    /* Right Status Sidebar */
    .status-sidebar {
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }
    .status-group {
      background: #0E1422;
      border: 1px solid #1E273A;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .status-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94A3B8;
      padding-bottom: 6px;
      border-bottom: 1px solid #1A2234;
    }
    .status-metric {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
    }
    .status-metric .label { color: #64748B; font-weight: 600; }
    .status-metric .val { color: #E2E8F0; font-family: monospace; font-weight: 700; }
    .status-metric .val.online { color: #34D399; }
    .status-metric .val.speaking { color: #10B981; }

    .device-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      border-radius: 8px;
      background: #131A2B;
      font-size: 11px;
    }
    .device-pill span.name { color: #CBD5E1; font-weight: 600; }
    .device-pill span.state { color: #34D399; font-weight: 700; font-size: 10px; font-family: monospace; }
  </style>
</head>
<body>
  <!-- Top Sub-Bar -->
  <div class="top-subbar">
    <div class="left">
      <div class="badge">
        <span class="badge-dot" id="header-dot"></span>
        <span id="header-status">Client Connected</span>
      </div>
      <span>Target: <strong style="color: #F8FAFC;">${safeCompany}</strong> · ${safeRole}</span>
    </div>
    <div>
      <span style="font-family: monospace;">Transport: <strong style="color: #34D399;">WebRTC (P2P)</strong></span>
    </div>
  </div>

  <!-- Main Connected-Interview Dashboard Grid -->
  <div class="dashboard-grid">
    <!-- Left Main Column -->
    <div class="main-stack">
      <!-- Media Row: Compact Bot Video + Bot Audio -->
      <div class="media-row">
        <!-- Compact Bot Video Panel -->
        <div class="panel-card">
          <div class="panel-header">
            <span>Bot video</span>
            <div class="indicator">
              <span class="badge-dot" id="video-dot"></span>
              <span id="video-status-txt">Ready</span>
            </div>
          </div>
          <div class="panel-content bot-video-container">
            <video id="simli-video" autoplay playsinline muted></video>
            <div id="orb-placeholder" class="compact-orb-wrap">
              <div class="compact-orb">
                <div class="compact-orb-core">
                  <div style="width: 8px; height: 8px; background: #34D399; border-radius: 50%; box-shadow: 0 0 8px #34D399;"></div>
                </div>
              </div>
              <div class="compact-orb-text" id="avatar-label">AI Interviewer Avatar</div>
            </div>
          </div>
        </div>

        <!-- Separate Bot Audio Panel -->
        <div class="panel-card">
          <div class="panel-header">
            <span>Bot audio</span>
            <div class="indicator" id="audio-status-txt">
              <span>Idle</span>
            </div>
          </div>
          <div class="panel-content audio-visualizer-wrap">
            <div class="waveform-bars">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
            </div>
            <div class="audio-meta">
              <span id="audio-speaker-label">Voice: ElevenLabs Sarah</span>
              <span>•</span>
              <span id="audio-state-badge" class="active">Listening</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Conversation Panel -->
      <div class="panel-card conversation-panel">
        <div class="panel-header">
          <span>Conversation</span>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;" id="msg-counter">1 entry</span>
        </div>
        <div class="panel-content convo-list" id="convo-container">
          <div class="chat-bubble bot">
            <div class="speaker">AI Interviewer</div>
            <div id="convo-bot-q">Initializing technical interview session...</div>
          </div>
        </div>
      </div>

      <!-- Events Panel -->
      <div class="panel-card events-panel">
        <div class="panel-header">
          <span>Events</span>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">RTVI Stream</span>
        </div>
        <div class="panel-content events-list" id="events-container">
          <div class="event-row info">
            <span class="time">00:00:01</span>
            <span class="tag">client</span>
            <span>Client initialized in interview session</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Status Sidebar -->
    <div class="status-sidebar">
      <div class="status-group">
        <div class="status-title">Agent Readiness</div>
        <div class="status-metric">
          <span class="label">Client State</span>
          <span class="val online" id="stat-client-state">Connected</span>
        </div>
        <div class="status-metric">
          <span class="label">Agent State</span>
          <span class="val" id="stat-agent-state" style="color: #60A5FA;">Listening</span>
        </div>
        <div class="status-metric">
          <span class="label">Audio Pipeline</span>
          <span class="val online">ElevenLabs Active</span>
        </div>
        <div class="status-metric">
          <span class="label">Video Transport</span>
          <span class="val" id="stat-webrtc-state">Negotiating...</span>
        </div>
      </div>

      <div class="status-group">
        <div class="status-title">Device Telemetry</div>
        <div class="device-pill">
          <span class="name">Bot Video Track</span>
          <span class="state" id="dev-video-state">Standby</span>
        </div>
        <div class="device-pill">
          <span class="name">Bot Audio Channel</span>
          <span class="state" id="dev-audio-state">Active</span>
        </div>
        <div class="device-pill">
          <span class="name">Latency (RTT)</span>
          <span class="state" style="color: #94A3B8;">~32ms</span>
        </div>
      </div>

      <div class="status-group">
        <div class="status-title">Session Context</div>
        <div class="status-metric">
          <span class="label">Target</span>
          <span class="val" style="color: #CBD5E1;">${safeCompany}</span>
        </div>
        <div class="status-metric">
          <span class="label">Role</span>
          <span class="val" style="color: #CBD5E1;">${safeRole}</span>
        </div>
        <div class="status-metric">
          <span class="label">Voice Model</span>
          <span class="val" style="color: #34D399;">Sarah (Flash v2.5)</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Single Audio Element to Guarantee 1x Playback Instance -->
  <audio id="bot-audio" preload="auto"></audio>

  <script>
    let peerConnection = null;
    let webSocket = null;
    let isSpeaking = false;
    let isMuted = false;
    let currentSpeechText = null;

    const videoEl = document.getElementById('simli-video');
    const audioEl = document.getElementById('bot-audio');
    const orbPlaceholder = document.getElementById('orb-placeholder');
    const convoContainer = document.getElementById('convo-container');
    const convoBotQ = document.getElementById('convo-bot-q');
    const eventsContainer = document.getElementById('events-container');
    const audioBars = document.querySelectorAll('.waveform-bars .bar');
    const statAgentState = document.getElementById('stat-agent-state');
    const statWebRTCState = document.getElementById('stat-webrtc-state');
    const devVideoState = document.getElementById('dev-video-state');
    const audioStateBadge = document.getElementById('audio-state-badge');
    const audioStatusTxt = document.getElementById('audio-status-txt');

    function getTimestamp() {
      const now = new Date();
      return now.toTimeString().split(' ')[0];
    }

    function addEventLog(tag, msg, type = 'info') {
      if (!eventsContainer) return;
      const row = document.createElement('div');
      row.className = 'event-row ' + type;
      row.innerHTML = '<span class="time">' + getTimestamp() + '</span><span class="tag">' + tag + '</span><span>' + msg + '</span>';
      eventsContainer.appendChild(row);
      eventsContainer.scrollTop = eventsContainer.scrollHeight;
    }

    function emitEvent(type, data) {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: type, data: data }, '*');
        }
      } catch (e) {}
    }

    // Set Audio State (Speaking vs Listening)
    function setAudioSpeaking(speaking) {
      isSpeaking = speaking;
      if (speaking) {
        audioBars.forEach(b => b.classList.add('speaking'));
        if (statAgentState) { statAgentState.textContent = 'Speaking'; statAgentState.style.color = '#10B981'; }
        if (audioStateBadge) { audioStateBadge.textContent = 'Speaking'; audioStateBadge.style.color = '#10B981'; }
        if (audioStatusTxt) audioStatusTxt.innerHTML = '<span style="color: #10B981; font-weight: 700;">Active</span>';
        addEventLog('speech', 'Bot started speaking response', 'speech');
        emitEvent('RTVI_BOT_SPEAKING');
      } else {
        audioBars.forEach(b => b.classList.remove('speaking'));
        if (statAgentState) { statAgentState.textContent = 'Listening'; statAgentState.style.color = '#60A5FA'; }
        if (audioStateBadge) { audioStateBadge.textContent = 'Listening'; audioStateBadge.style.color = '#34D399'; }
        if (audioStatusTxt) audioStatusTxt.innerHTML = '<span>Idle</span>';
        addEventLog('speech', 'Bot finished speaking — ready for input', 'speech');
        emitEvent('RTVI_BOT_IDLE');
      }
    }

    // 1. Play Single-Instance ElevenLabs TTS Audio
    async function playInterviewerAudio(text) {
      if (!text || isMuted) return;

      // Deduplicate rapid consecutive triggers of identical question text
      if (isSpeaking && currentSpeechText === text) {
        return;
      }
      currentSpeechText = text;

      // Update Conversation Panel
      if (convoBotQ) convoBotQ.textContent = text;

      // Stop any prior playback to prevent overlaps
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }

      setAudioSpeaking(true);

      try {
        const res = await fetch('/api/v1/interview/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (!res.ok) {
          throw new Error('TTS returned status ' + res.status);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioEl.src = url;

        audioEl.onended = () => {
          setAudioSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audioEl.onerror = () => {
          setAudioSpeaking(false);
          URL.revokeObjectURL(url);
        };

        await audioEl.play();
      } catch (err) {
        console.warn('[Avatar Console] ElevenLabs stream error, falling back to Web Speech:', err);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(text);
          utt.rate = 1.0;
          utt.pitch = 1.05;
          utt.onend = () => setAudioSpeaking(false);
          utt.onerror = () => setAudioSpeaking(false);
          window.speechSynthesis.speak(utt);
        } else {
          setAudioSpeaking(false);
        }
      }
    }

    // 2. Real-Time Simli WebRTC Connection (Compact Bot Video Panel)
    async function initWebRTC() {
      addEventLog('webrtc', 'Requesting Simli WebRTC session token...', 'webrtc');
      if (statWebRTCState) statWebRTCState.textContent = 'Connecting...';

      try {
        const sessionRes = await fetch('/api/v1/interview/simli-session');
        const sessionData = await sessionRes.json();

        if (!sessionData.available || !sessionData.session_token) {
          addEventLog('webrtc', 'Simli session token unavailable, audio mode active', 'info');
          if (statWebRTCState) statWebRTCState.textContent = 'Audio-Only';
          if (devVideoState) devVideoState.textContent = 'Audio Only';
          emitEvent('RTVI_CONNECTED');
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
            if (orbPlaceholder) orbPlaceholder.classList.add('hidden');
            if (statWebRTCState) statWebRTCState.textContent = 'P2P Connected';
            if (devVideoState) devVideoState.textContent = '720p Active';
            addEventLog('webrtc', 'Remote video track attached to Bot Video panel', 'webrtc');
          }
        };

        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === 'connected') {
            if (statWebRTCState) statWebRTCState.textContent = 'P2P Connected';
            addEventLog('webrtc', 'WebRTC peer connection established', 'webrtc');
            emitEvent('RTVI_CONNECTED');
          } else if (peerConnection.connectionState === 'failed') {
            if (statWebRTCState) statWebRTCState.textContent = 'Audio Passthrough';
            addEventLog('webrtc', 'Peer connection fallback to audio pipeline', 'info');
          }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const wsUrl = 'wss://api.simli.ai/compose/webrtc/p2p?enableSFU=true&session_token=' + encodeURIComponent(sessionData.session_token);
        webSocket = new WebSocket(wsUrl);

        webSocket.onopen = () => {
          addEventLog('webrtc', 'WebSocket signaling channel open, sending offer', 'webrtc');
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
              addEventLog('webrtc', 'Remote SDP answer applied successfully', 'webrtc');
              emitEvent('RTVI_CONNECTED');
            }
          } catch (e) {}
        };

        webSocket.onerror = (err) => {
          addEventLog('webrtc', 'Signaling channel error, continuing in audio mode', 'info');
          emitEvent('RTVI_CONNECTED');
        };

      } catch (err) {
        addEventLog('webrtc', 'WebRTC initialization error: ' + err.message, 'info');
        emitEvent('RTVI_CONNECTED');
      }
    }

    // 3. Message Coordination with Parent Window
    window.addEventListener('message', function(ev) {
      if (!ev.data || typeof ev.data !== 'object') return;
      const type = ev.data.type;

      switch (type) {
        case 'PLACEX_SPEAK':
          if (ev.data.text) {
            playInterviewerAudio(ev.data.text);
          }
          break;

        case 'PLACEX_CONNECT':
          if (!peerConnection || peerConnection.connectionState !== 'connected') {
            initWebRTC();
          } else {
            emitEvent('RTVI_CONNECTED');
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
          emitEvent('RTVI_DISCONNECTED');
          break;
      }
    });

    window.addEventListener('load', function() {
      emitEvent('RTVI_READY');
      setTimeout(initWebRTC, 200);
    });
  </script>
</body>
</html>`;
}
