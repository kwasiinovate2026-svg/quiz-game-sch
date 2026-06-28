const PLACEHOLDER_BACKEND_URLS = new Set([
  'https://api',
  'http://api',
  'api',
  'https://backend',
  'http://backend',
]);
const ROOM_STORE = new Map();

function generateRoomCode() {
  return Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value ?? '')) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return hash >>> 0;
}

function createSeededRng(seed) {
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRoomSeed(code = '') {
  return hashString(`${code}:${Date.now()}:${Math.random()}`);
}

function buildRoomQuestion(room, roundIndex = 0, questionIndex = 0) {
  const settings = room && room.settings ? room.settings : {};
  const subject = String(settings.subject || 'All subjects').trim();
  const level = String(settings.level || 'JHS').trim();
  const baseSeed = (room && room.questionSeed ? room.questionSeed : generateRoomSeed(room && room.code)) + roundIndex * 97 + questionIndex * 11;
  const rng = createSeededRng(baseSeed);

  if (subject.includes('English')) {
    const choices = [
      'The pupils were reading when the teacher arrived.',
      'The pupils was reading when the teacher arrived.',
      'The pupils are reading when the teacher arrived.',
      'The pupils read when the teacher arrive.',
    ];
    const answer = choices[0];
    const shuffled = [...choices].sort(() => rng() - 0.5);
    return {
      type: 'mcq',
      text: 'Choose the grammatically correct sentence for this class activity.',
      options: shuffled,
      answerIndex: shuffled.indexOf(answer),
      answerText: answer,
      subj: subject,
      difficulty: level,
    };
  }

  if (subject.includes('Science') || subject.includes('Social') || subject.includes('History') || subject.includes('Computing')) {
    const value = 2 + Math.floor(rng() * 8);
    const other = 3 + Math.floor(rng() * 6);
    const answer = value + other;
    return {
      type: 'mcq',
      text: `What is ${value} + ${other}?`,
      options: [String(answer), String(answer + 1), String(answer + 2), String(answer - 1)],
      answerIndex: 0,
      answerText: String(answer),
      subj: subject,
      difficulty: level,
    };
  }

  const first = 2 + Math.floor(rng() * 9);
  const second = 2 + Math.floor(rng() * 8);
  const answer = first * second;
  const distractors = [answer + 1, answer + 2, answer - 1].filter((value, index, list) => list.indexOf(value) === index);
  const options = [String(answer), ...distractors.slice(0, 3)];
  while (options.length < 4) {
    options.push(String(Number(answer) + options.length));
  }

  return {
    type: 'mcq',
    text: `What is ${first} × ${second}?`,
    options,
    answerIndex: options.indexOf(String(answer)),
    answerText: String(answer),
    subj: subject,
    difficulty: level,
  };
}

function getDefaultSettings(settings = {}) {
  return {
    level: settings.level || 'JHS',
    subject: settings.subject || 'All subjects',
    perRound: settings.perRound || 200,
    seconds: settings.seconds || 45,
    rounds: settings.rounds || 3,
    aiCount: settings.aiCount || 0,
    aiDiff: settings.aiDiff || 'medium',
  };
}

function toPlayer({ id, name, connected = true }) {
  const displayName = String(name || 'Player').trim() || 'Player';
  return {
    id: String(id || `player-${Date.now()}`).trim(),
    name: displayName,
    displayName,
    connected,
    score: 0,
  };
}

function getPlayer(room, playerId) {
  return room && Array.isArray(room.players)
    ? room.players.find((player) => player.id === String(playerId || ''))
    : null;
}

function normalizeResponseText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function buildQuizMessage(room, outcome = 'intro', answerText = '') {
  const base = room && room.settings ? room.settings.subject : 'the quiz';
  if (outcome === 'correct') {
    return `Aria says: excellent work! That was the best answer for ${base}.`;
  }
  if (outcome === 'incorrect') {
    const answer = answerText ? ` The best answer was ${answerText}.` : '';
    return `Aria says: close one. ${answer} Keep your focus for the next question.`;
  }
  if (outcome === 'skip') {
    return 'Aria says: moving on quickly so the pace stays lively.';
  }
  return `Aria says: welcome to ${base}. Choose the best answer or type your response.`;
}

function createRoomSnapshot(room) {
  return {
    ok: true,
    phase: room.phase || 'lobby',
    code: room.code,
    hostId: room.hostId,
    players: room.players,
    settings: room.settings,
    subjLabel: room.settings.subject,
    serverNow: room.serverNow || Date.now(),
    stage: room.stage,
    round: room.round ?? 0,
    qInRound: room.qInRound ?? 0,
    ownerId: room.ownerId || room.hostId,
    question: room.question,
    qm: room.qm,
    revealed: Boolean(room.revealed),
    correctIndex: room.correctIndex,
    ownResult: room.ownResult,
    bonusLockedIds: room.bonusLockedIds || [],
    bonusWinnerId: room.bonusWinnerId,
  };
}

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
          id: safeBody.playerId || 'local-user',
          email: safeBody.email || 'player@example.com',
          displayName: safeBody.displayName || safeBody.name || 'Local Player',
        },
      };
    case 'signup':
      return {
        ok: true,
        token: 'local-dev-token',
        user: {
          id: safeBody.playerId || 'local-user',
          email: safeBody.email || 'player@example.com',
          displayName: safeBody.displayName || safeBody.name || 'Local Player',
        },
      };
    case 'create': {
      const roomCode = String(safeBody.code || '').trim().toUpperCase() || generateRoomCode();
      const hostId = String(safeBody.playerId || 'local-user').trim();
      const hostName = String(safeBody.name || safeBody.displayName || 'Local Player').trim();
      const room = {
        code: roomCode,
        hostId,
        phase: 'lobby',
        players: [toPlayer({ id: hostId, name: hostName, connected: true })],
        settings: getDefaultSettings(safeBody.settings),
        questionSeed: generateRoomSeed(roomCode),
        serverNow: Date.now(),
        qm: {
          id: `qm-${roomCode}-${Date.now()}`,
          mood: 'sky',
          text: 'Aria is ready. Invite your players and start the quiz when you are ready.',
        },
      };
      ROOM_STORE.set(roomCode, room);
      return createRoomSnapshot(room);
    }
    case 'join': {
      const roomCode = String(safeBody.code || '').trim().toUpperCase();
      const room = ROOM_STORE.get(roomCode);
      if (!room) {
        return { ok: false, error: 'room_not_found', message: 'Room not found' };
      }
      const playerId = String(safeBody.playerId || `player-${Date.now()}`).trim();
      const playerName = String(safeBody.name || safeBody.displayName || 'Player').trim();
      if (!room.players.some((player) => player.id === playerId)) {
        room.players.push(toPlayer({ id: playerId, name: playerName, connected: true }));
      }
      room.serverNow = Date.now();
      return createRoomSnapshot(room);
    }
    case 'start': {
      const roomCode = String(safeBody.code || '').trim().toUpperCase();
      const room = ROOM_STORE.get(roomCode);
      if (!room) {
        return { ok: false, error: 'room_not_found', message: 'Room not found' };
      }
      room.phase = 'playing';
      room.stage = 'answering';
      room.round = 0;
      room.qInRound = 0;
      room.ownerId = room.hostId;
      room.revealed = false;
      room.correctIndex = null;
      room.ownResult = null;
      room.questionSeed = room.questionSeed || generateRoomSeed(room.code);
      room.question = buildRoomQuestion(room, room.round, room.qInRound);
      room.qm = {
        id: `qm-${room.code}-${Date.now()}`,
        mood: 'sky',
        text: 'Aria is hosting. Choose the best answer or type your response.',
      };
      room.serverNow = Date.now();
      return createRoomSnapshot(room);
    }
    case 'state': {
      const roomCode = String(safeBody.code || '').trim().toUpperCase();
      const room = ROOM_STORE.get(roomCode);
      if (!room) {
        return { ok: false, error: 'room_not_found', message: 'Room not found' };
      }
      return createRoomSnapshot(room);
    }
    case 'answer': {
      const roomCode = String(safeBody.code || '').trim().toUpperCase();
      if (!roomCode) {
        return {
          ok: true,
          correct: true,
          message: 'Local fallback backend accepted the answer.',
        };
      }
      const room = ROOM_STORE.get(roomCode);
      if (!room) {
        return { ok: false, error: 'room_not_found', message: 'Room not found' };
      }
      const player = getPlayer(room, safeBody.playerId);
      const question = room.question;
      if (!player || !question) {
        return createRoomSnapshot(room);
      }

      const choice = safeBody.choice;
      let isCorrect = false;
      let answerText = '';
      if (question.type === 'mcq') {
        const answerIndex = Number(question.answerIndex ?? 0);
        const choiceIndex = Number(choice ?? -1);
        isCorrect = choiceIndex === answerIndex;
        answerText = String(question.answerText || question.options?.[answerIndex] || '');
      } else {
        const normalizedChoice = normalizeResponseText(choice);
        const normalizedAnswer = normalizeResponseText(question.answer || question.answerText || '');
        isCorrect = normalizedChoice.length > 0 && normalizedAnswer.length > 0 && normalizedChoice === normalizedAnswer;
        answerText = String(question.answerText || question.answer || '');
      }

      if (player) {
        player.score = Number(player.score || 0) + (isCorrect ? 10 : 0);
      }

      room.revealed = true;
      room.stage = 'reveal';
      room.correctIndex = question.answerIndex ?? null;
      room.ownResult = isCorrect ? 'correct' : 'incorrect';
      room.qm = {
        id: `qm-${room.code}-${Date.now()}`,
        mood: isCorrect ? 'mint' : 'coral',
        text: isCorrect
          ? `Aria says: excellent work! ${player.name || 'Player'} chose the correct answer.`
          : `Aria says: the best answer was ${answerText || 'the correct choice'}.`,
      };
      room.serverNow = Date.now();
      return createRoomSnapshot(room);
    }
    case 'skip': {
      const roomCode = String(safeBody.code || '').trim().toUpperCase();
      const room = ROOM_STORE.get(roomCode);
      if (!room) {
        return { ok: false, error: 'room_not_found', message: 'Room not found' };
      }
      room.qInRound = (room.qInRound || 0) + 1;
      if (room.qInRound >= Math.max(1, Number(room.settings.perRound) || 200)) {
        room.qInRound = 0;
        room.round = (room.round || 0) + 1;
      }
      room.revealed = false;
      room.stage = 'answering';
      room.correctIndex = null;
      room.ownResult = null;
      room.ownerId = room.hostId;
      room.question = buildRoomQuestion(room, room.round, room.qInRound);
      room.qm = {
        id: `qm-${room.code}-${Date.now()}`,
        mood: 'sky',
        text: 'Aria says: moving on quickly so the pace stays lively.',
      };
      room.serverNow = Date.now();
      return createRoomSnapshot(room);
    }
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
