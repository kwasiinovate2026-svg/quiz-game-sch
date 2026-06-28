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
    case 'create': {
      const settings = {
        level: safeBody.settings?.level || 'JHS',
        subject: safeBody.settings?.subject || 'All subjects',
        perRound: safeBody.settings?.perRound || 200,
        seconds: safeBody.settings?.seconds || 45,
        rounds: safeBody.settings?.rounds || 3,
        aiCount: safeBody.settings?.aiCount || 0,
        aiDiff: safeBody.settings?.aiDiff || 'medium',
      };
      return {
        ok: true,
        phase: 'lobby',
        code: 'ABCD',
        hostId: 'local-user',
        players: [{ id: 'local-user', name: safeBody.name || 'Local Player', displayName: safeBody.name || 'Local Player', connected: true }],
        settings,
        subjLabel: settings.subject,
        serverNow: Date.now(),
      };
    }
    case 'join': {
      const settings = {
        level: safeBody.settings?.level || 'JHS',
        subject: safeBody.settings?.subject || 'All subjects',
        perRound: safeBody.settings?.perRound || 200,
        seconds: safeBody.settings?.seconds || 45,
        rounds: safeBody.settings?.rounds || 3,
        aiCount: safeBody.settings?.aiCount || 0,
        aiDiff: safeBody.settings?.aiDiff || 'medium',
      };
      return {
        ok: true,
        phase: 'lobby',
        code: (safeBody.code || 'ABCD').toUpperCase(),
        hostId: 'local-user',
        players: [{ id: 'local-user', name: safeBody.name || 'Local Player', displayName: safeBody.name || 'Local Player', connected: true }],
        settings,
        subjLabel: settings.subject,
        serverNow: Date.now(),
      };
    }
    case 'start':
      return {
        ok: true,
        phase: 'playing',
        stage: 'answering',
        round: 0,
        qInRound: 0,
        phase: 'playing',
        settings: { level: 'JHS', subject: 'All subjects', perRound: 20, seconds: 45, rounds: 3, aiCount: 0, aiDiff: 'medium' },
        players: [{ id: 'local-user', name: 'Local Player', displayName: 'Local Player', score: 0, connected: true }],
        ownerId: 'local-user',
        question: {
          type: 'mcq',
          text: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          answerIndex: 1,
        },
        subjLabel: 'All subjects',
        serverNow: Date.now(),
      };
    case 'state':
      return {
        ok: true,
        phase: 'lobby',
        code: safeBody.code || 'ABCD',
        hostId: 'local-user',
        players: [{ id: 'local-user', name: 'Local Player', displayName: 'Local Player', connected: true }],
        settings: { level: 'JHS', subject: 'All subjects', perRound: 200, seconds: 45, rounds: 3, aiCount: 0, aiDiff: 'medium' },
        subjLabel: 'All subjects',
        serverNow: Date.now(),
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
