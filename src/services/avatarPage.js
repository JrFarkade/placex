// PlaceX Live AI Interviewer Interactive Avatar Stream
export function getAvatarHtml(company = "Target Company", role = "Software Engineer") {
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
    }
    .avatar-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
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
      background: rgba(10, 13, 20, 0.8);
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

    .meta-box {
      margin-top: 24px;
      text-align: center;
      z-index: 10;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34D399;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 8px #34D399;
      animation: blink 1.5s ease-in-out infinite;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .role-title {
      font-size: 14px;
      font-weight: 700;
      color: #E2E8F0;
    }
    .subtext {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="avatar-container">
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
  <div class="meta-box">
    <div class="badge">
      <span class="badge-dot"></span>
      <span>AI Technical Interviewer Active</span>
    </div>
    <div class="role-title">PlaceX Live Interview Engine</div>
    <div class="subtext">Real-time Speech Evaluation · Audio Synthesis Active</div>
  </div>
  <script>
    function notifyConnected() {
      try {
        window.parent.postMessage({ type: 'RTVI_CONNECTED' }, '*');
      } catch (e) {}
    }
    window.addEventListener('load', function() {
      setTimeout(notifyConnected, 600);
    });
    window.addEventListener('message', function(ev) {
      if (ev.data && (ev.data.type === 'PLACEX_CONNECT' || ev.data.type === 'PING')) {
        notifyConnected();
      }
    });
  </script>
</body>
</html>`;
}
