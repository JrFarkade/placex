export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /api endpoints to live FastAPI backend if BACKEND_URL environment variable is provided
    if (url.pathname.startsWith('/api')) {
      const backendBase = env.BACKEND_URL || 'https://placex-api.onrender.com';
      const targetUrl = new URL(url.pathname + url.search, backendBase);

      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('X-Forwarded-Host', url.hostname);

      return fetch(targetUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
        redirect: 'follow'
      });
    }

    // Fall back to serving static frontend assets (HTML/JS/CSS)
    return env.ASSETS.fetch(request);
  }
};
