const PLACEHOLDER_BACKEND_URLS = new Set([
  'https://api',
  'http://api',
  'api',
  'https://backend',
  'http://backend',
]);

export function normalizeBackendUrl(value) {
  const raw = (value || '').trim();
  if (!raw) return null;

  const normalized = raw.replace(/\/+$/, '');
  const lower = normalized.toLowerCase();
  if (PLACEHOLDER_BACKEND_URLS.has(lower)) return null;

  if (!/^https?:\/\//i.test(normalized)) {
    return `https://${normalized.replace(/^\/+/, '')}`;
  }

  return normalized;
}

export function getBackendTargetUrl(baseUrl, routePath = '') {
  const normalizedBaseUrl = normalizeBackendUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error('BACKEND_URL is not configured');
  }

  const cleanedPath = (routePath || '').replace(/^\/+/, '').replace(/\/+$/, '');
  return cleanedPath ? `${normalizedBaseUrl}/${cleanedPath}` : normalizedBaseUrl;
}

export function buildLocalBackendResponse(action, body = {}) {
  const actionName = String(action || '').trim().toLowerCase();
  const safeBody = body && typeof body === 'object' ? body : {};

  switch (actionName) {
    case 'login':
      return {
        ok: true,
        token: 'local-dev-token',
        user: {
          id: 'local-user',
          email: safeBody.email || 'player@example.com',
          displayName: safeBody.displayName || safeBody.name || 'Local Player',
        },
      };
    case 'signup':
      return {
        ok: true,
        token: 'local-dev-token',
        user: {
          id: 'local-user',
          email: safeBody.email || 'player@example.com',
          displayName: safeBody.displayName || safeBody.name || 'Local Player',
        },
      };
    case 'create':
      return {
        ok: true,
        roomId: 'local-room',
        hostId: 'local-user',
        players: [{ id: 'local-user', displayName: safeBody.displayName || 'Local Player' }],
      };
    case 'join':
      return {
        ok: true,
        roomId: safeBody.roomId || 'local-room',
        player: { id: 'local-user', displayName: safeBody.displayName || 'Local Player' },
      };
    case 'start':
      return {
        ok: true,
        status: 'started',
        round: 1,
        question: {
          type: 'mcq',
          text: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          answerIndex: 1,
        },
      };
    case 'state':
      return {
        ok: true,
        status: 'waiting',
        round: 0,
        players: [{ id: 'local-user', displayName: 'Local Player' }],
      };
    case 'answer':
      return {
        ok: true,
        correct: true,
        message: 'Local fallback backend accepted the answer.',
      };
    case 'skip':
      return {
        ok: true,
        message: 'Local fallback backend skipped the question.',
      };
    case 'leave':
      return {
        ok: true,
        message: 'Local fallback backend removed the player.',
      };
    case 'league':
      return {
        ok: true,
        league: [],
        message: 'Local fallback backend is active.',
      };
    default:
      return {
        ok: true,
        message: 'Local fallback backend is active.',
      };
  }
}
