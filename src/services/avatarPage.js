// PlaceX Live AI Interviewer Real-Time WebRTC Avatar & Audio Pipeline
export function getAvatarHtml(company = "Target Company", role = "Software Engineer") {
  const safeCompany = company.replace(/"/g, '&quot;');
  const safeRole = role.replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlaceX AI Technical Interviewer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0A0D14;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 32px 32px, 32px 32px;
      pointer-events: none;
      z-index: 1;
    }
    
    /* Simli Live WebRTC Video Stream */
    .video-viewport {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      background: #0A0D14;
    }
    #simli-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.6s ease-in-out;
    }
    #simli-video.active {
      opacity: 1;
    }

    /* Ambient Neural Core Layer (shown while negotiating or during audio synthesis) */
    .avatar-neural-layer {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 3;
      transition: opacity 0.5s ease-in-out;
    }
    .avatar-neural-layer.video-ready {
      opacity: 0;
      pointer-events: none;
    }
    .pulse-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(16, 185, 129, 0.35);
      animation: pulse 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    .pulse-ring:nth-child(1) { width: 180px; height: 180px; animation-delay: 0s; }
    .pulse-ring:nth-child(2) { width: 240px; height: 240px; animation-delay: 1s; }
    .pulse-ring:nth-child(3) { width: 300px; height: 300px; animation-delay: 2s; }

    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(1.3); opacity: 0; }
    }

    .avatar-orb {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #34D399, #059669 50%, #064E3B 100%);
      box-shadow: 0 0 45px rgba(16, 185, 129, 0.4), inset 0 0 25px rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      animation: float 4s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-8px) scale(1.02); }
    }

    .neural-core {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(10, 13, 20, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 15px rgba(16, 185, 129, 0.8);
    }

    .waveform-bars {
      display: flex;
      gap: 4px;
      align-items: center;
      height: 36px;
    }

    .bar {
      width: 4px;
      background: #34D399;
      border-radius: 2px;
      animation: wave 1.2s ease-in-out infinite alternate;
    }
    .bar:nth-child(1) { height: 14px; animation-delay: 0.1s; }
    .bar:nth-child(2) { height: 24px; animation-delay: 0.3s; }
    .bar:nth-child(3) { height: 32px; animation-delay: 0.5s; }
    .bar:nth-child(4) { height: 22px; animation-delay: 0.2s; }
    .bar:nth-child(5) { height: 12px; animation-delay: 0.4s; }

    @keyframes wave {
      0% { transform: scaleY(0.4); opacity: 0.5; }
      100% { transform: scaleY(1.2); opacity: 1; }
    }

    /* Live HUD Overlay at bottom */
    .hud-overlay {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      z-index: 10;
      background: rgba(10, 15, 25, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 10px 20px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 8px #34D399;
      animation: blink 1.5s ease-in-out infinite;
    }
    .badge-dot.connecting {
      background: #F59E0B;
      box-shadow: 0 0 8px #F59E0B;
    }
    .badge-dot.speaking {
      background: #10B981;
      box-shadow: 0 0 12px #10B981;
      animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .status-text {
      font-size: 12px;
      font-weight: 700;
      color: #E2E8F0;
      letter-spacing: 0.02em;
    }
    .subtext {
      font-size: 11px;
      color: #94A3B8;
    }
    .retry-btn {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34D399;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .retry-btn:hover {
      background: rgba(16, 185, 129, 0.35);
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>

  <!-- Primary Video Viewport for Simli WebRTC -->
  <div class="video-viewport">
    <video id="simli-video" autoplay playsinline muted></video>
  </div>

  <!-- Audio playback element for ElevenLabs Voice -->
  <audio id="speech-audio" preload="auto"></audio>

  <!-- Ambient Neural Layer (Displayed when video is negotiating or initializing) -->
  <div id="neural-layer" class="avatar-neural-layer">
    <div class="pulse-ring"></div>
    <div class="pulse-ring"></div>
    <div class="pulse-ring"></div>
    <div class="avatar-orb">
      <div class="neural-core">
        <div class="waveform-bars">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Live Status HUD Overlay -->
  <div class="hud-overlay">
    <span id="status-dot" class="badge-dot connecting"></span>
    <span id="status-label" class="status-text">Initializing AI Interviewer...</span>
    <span class="subtext">|</span>
    <span class="subtext">${safeCompany} · ${safeRole}</span>
    <button id="retry-btn" class="retry-btn" style="display:none;" onclick="initWebRTC()">Retry</button>
  </div>

  <script>
    let peerConnection = null;
    let webSocket = null;
    let currentAudio = null;
    let isSpeaking = false;
    let isSpeakerMuted = false;

    const videoEl = document.getElementById('simli-video');
    const audioEl = document.getElementById('speech-audio');
    const neuralLayer = document.getElementById('neural-layer');
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    const retryBtn = document.getElementById('retry-btn');

    function updateStatus(state, labelText) {
      if (statusLabel) statusLabel.textContent = labelText;
      if (statusDot) {
        statusDot.className = 'badge-dot ' + state;
      }
    }

    function emitEvent(type, data) {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: type, data: data }, '*');
        }
      } catch (e) {
        console.warn('[Avatar] postMessage error:', e);
      }
    }

    // 1. Establish Real-Time WebRTC Video Stream to Simli Avatar
    async function initWebRTC() {
      if (retryBtn) retryBtn.style.display = 'none';
      updateStatus('connecting', 'Negotiating WebRTC Avatar Stream...');

      try {
        const sessionRes = await fetch('/api/v1/interview/simli-session');
        const sessionData = await sessionRes.json();

        if (!sessionData.available || !sessionData.session_token) {
          console.warn('[Avatar] Simli session unavailable:', sessionData.error);
          updateStatus('', 'AI Interviewer Ready (Audio Active)');
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
            if (neuralLayer) neuralLayer.classList.add('video-ready');
            updateStatus('', 'AI Interviewer Active');
          }
        };

        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === 'connected') {
            updateStatus('', 'AI Interviewer Active');
            emitEvent('RTVI_CONNECTED');
          } else if (peerConnection.connectionState === 'failed') {
            updateStatus('connecting', 'Reconnecting Media Stream...');
            if (retryBtn) retryBtn.style.display = 'inline-block';
          }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const wsUrl = 'wss://api.simli.ai/compose/webrtc/p2p?enableSFU=true&session_token=' + encodeURIComponent(sessionData.session_token);
        webSocket = new WebSocket(wsUrl);

        webSocket.onopen = () => {
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
              updateStatus('', 'AI Interviewer Active');
              emitEvent('RTVI_CONNECTED');
            }
          } catch (e) {
            console.warn('[Avatar] WebSocket message parsing error:', e);
          }
        };

        webSocket.onerror = (err) => {
          console.warn('[Avatar] Simli WebSocket error:', err);
          updateStatus('', 'AI Interviewer Ready (Audio Active)');
          emitEvent('RTVI_CONNECTED');
        };

      } catch (err) {
        console.warn('[Avatar] WebRTC initialization error:', err);
        updateStatus('', 'AI Interviewer Ready (Audio Active)');
        emitEvent('RTVI_CONNECTED');
        if (retryBtn) retryBtn.style.display = 'inline-block';
      }
    }

    // 2. Play Authentic ElevenLabs Female Voice Audio Stream
    async function speakText(text) {
      if (!text || isSpeakerMuted) return;

      try {
        updateStatus('speaking', 'Interviewer Speaking...');
        emitEvent('RTVI_BOT_SPEAKING');

        // Cancel previous audio
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }

        const res = await fetch('/api/v1/interview/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text })
        });

        if (!res.ok) {
          // If ElevenLabs endpoint fails or returns error, fallback to browser speech synthesis
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.05;
            utterance.onstart = () => {
              updateStatus('speaking', 'Interviewer Speaking...');
              emitEvent('RTVI_BOT_SPEAKING');
            };
            utterance.onend = () => {
              updateStatus('', 'AI Interviewer Listening');
              emitEvent('RTVI_BOT_IDLE');
            };
            utterance.onerror = () => {
              updateStatus('', 'AI Interviewer Listening');
              emitEvent('RTVI_BOT_IDLE');
            };
            window.speechSynthesis.speak(utterance);
          }
          return;
        }

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        currentAudio = new Audio(audioUrl);

        currentAudio.onplay = () => {
          isSpeaking = true;
          updateStatus('speaking', 'Interviewer Speaking...');
          emitEvent('RTVI_BOT_SPEAKING');
        };

        currentAudio.onended = () => {
          isSpeaking = false;
          URL.revokeObjectURL(audioUrl);
          updateStatus('', 'AI Interviewer Listening');
          emitEvent('RTVI_BOT_IDLE');
        };

        currentAudio.onerror = () => {
          isSpeaking = false;
          URL.revokeObjectURL(audioUrl);
          updateStatus('', 'AI Interviewer Listening');
          emitEvent('RTVI_BOT_IDLE');
        };

        await currentAudio.play();
      } catch (err) {
        console.warn('[Avatar] Speech synthesis error:', err);
        updateStatus('', 'AI Interviewer Listening');
        emitEvent('RTVI_BOT_IDLE');
      }
    }

    function stopSpeech() {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      updateStatus('', 'AI Interviewer Listening');
      emitEvent('RTVI_BOT_IDLE');
    }

    // 3. Listen to Parent Window Coordination Messages
    window.addEventListener('message', function(ev) {
      if (!ev.data || typeof ev.data !== 'object') return;
      const type = ev.data.type;

      switch (type) {
        case 'PLACEX_CONNECT':
          if (!peerConnection || peerConnection.connectionState !== 'connected') {
            initWebRTC();
          } else {
            emitEvent('RTVI_CONNECTED');
          }
          break;

        case 'PLACEX_SPEAK':
          if (ev.data.text) {
            speakText(ev.data.text);
          }
          break;

        case 'PLACEX_STOP_SPEECH':
          stopSpeech();
          break;

        case 'PLACEX_MUTE_SPEAKER':
          isSpeakerMuted = !!ev.data.muted;
          if (isSpeakerMuted) stopSpeech();
          break;

        case 'PLACEX_DISCONNECT':
          stopSpeech();
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

    // Auto-initialize WebRTC stream on document load
    window.addEventListener('load', function() {
      setTimeout(initWebRTC, 300);
    });
  </script>
</body>
</html>`;
}
