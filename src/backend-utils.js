const PLACEHOLDER_BACKEND_URLS = new Set([
  'https://api',
  'http://api',
  'api',
  'https://backend',
  'http://backend',
]);
const ROOM_STORE = new Map();
let roomSeedCounter = 0;

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
  roomSeedCounter = (roomSeedCounter + 1) >>> 0;
  return hashString(`${code}:${Date.now()}:${Math.random()}:${roomSeedCounter}`);
}

function buildRoomQuestion(room, roundIndex = 0, questionIndex = 0) {
  const settings = room && room.settings ? room.settings : {};
  const subject = String(settings.subject || 'All subjects').trim();
  const level = String(settings.level || 'JHS').trim();
  const baseSeed = (room && room.questionSeed ? room.questionSeed : generateRoomSeed(room && room.code)) + roundIndex * 97 + questionIndex * 11;
  const rng = createSeededRng(baseSeed);
  const subjectKey = subject.toLowerCase();
  const levelKey = String(level).trim().toLowerCase().includes('primary') ? 'primary' : String(level).trim().toLowerCase().includes('shs') ? 'shs' : 'jhs';
  const isMath = subjectKey.includes('mathematics') || subjectKey.includes('numeracy');
  const isEnglish = subjectKey.includes('english') || subjectKey.includes('literature') || subjectKey.includes('language');
  const isScience = subjectKey.includes('science') || subjectKey.includes('physics') || subjectKey.includes('chemistry') || subjectKey.includes('biology') || subjectKey.includes('integrated');
  const isSocial = subjectKey.includes('social') || subjectKey.includes('history') || subjectKey.includes('government') || subjectKey.includes('geography') || subjectKey.includes('economics') || subjectKey.includes('our world') || subjectKey.includes('people');
  const isComputing = subjectKey.includes('computing') || subjectKey.includes('ict') || subjectKey.includes('computer');
  const isFrench = subjectKey.includes('french');
  const isRME = subjectKey.includes('religious') || subjectKey.includes('moral') || subjectKey.includes('rme');
  const isCareer = subjectKey.includes('career') || subjectKey.includes('technical') || subjectKey.includes('technology');
  const isGeneral = !isMath && !isEnglish && !isScience && !isSocial && !isComputing && !isFrench && !isRME && !isCareer;

  const makeMcq = (text, options, answerText) => ({
    type: 'mcq',
    text,
    options,
    answerIndex: Math.max(0, options.indexOf(answerText)),
    answerText,
    subj: subject,
    difficulty: level,
  });
  const makeShort = (text, answerText) => ({
    type: 'short',
    text,
    answer: answerText,
    answerText,
    subj: subject,
    difficulty: level,
  });
  const pickTemplate = (templates) => templates[Math.abs((questionIndex + roundIndex + Math.floor(rng() * 10)) % templates.length)];
  const useShort = (roundIndex + questionIndex + 1) % 4 === 0;

  if (isEnglish) {
    const templates = levelKey === 'primary'
      ? [
          {
            text: 'Choose the correct sentence.',
            options: ['The cat is on the mat.', 'The cat are on the mat.', 'The cat am on the mat.', 'The cat be on the mat.'],
            answerText: 'The cat is on the mat.',
          },
          {
            text: 'Choose the correct word to complete the sentence: I _____ to school every day.',
            options: ['go', 'goes', 'gone', 'going'],
            answerText: 'go',
          },
          {
            text: 'Which word is the opposite of “big”?',
            options: ['small', 'tall', 'fast', 'old'],
            answerText: 'small',
          },
        ]
      : levelKey === 'shs'
        ? [
            {
              text: 'Which sentence is most appropriate for a formal debate introduction?',
              options: ['The speaker explained the issue clearly and logically.', 'The speaker explain the issue clear and logic.', 'The speaker explaining the issue clearly and logical.', 'The speaker explained the issue clear and logical.'],
              answerText: 'The speaker explained the issue clearly and logically.',
            },
            {
              text: 'Choose the best way to complete the sentence: The committee ______ the report before making its decision.',
              options: ['studied', 'studies', 'study', 'studying'],
              answerText: 'studied',
            },
            {
              text: 'Which sentence shows the most effective formal writing style?',
              options: ['The findings are presented clearly and concisely.', 'The findings was presented clear and concise.', 'The findings are present clear and concise.', 'The findings presenting clear and concise.'],
              answerText: 'The findings are presented clearly and concisely.',
            },
          ]
        : [
            {
              text: 'Choose the grammatically correct sentence in this school report context.',
              options: ['The pupils were reading when the teacher arrived.', 'The pupils was reading when the teacher arrived.', 'The pupils are reading when the teacher arrived.', 'The pupils read when the teacher arrive.'],
              answerText: 'The pupils were reading when the teacher arrived.',
            },
            {
              text: 'Which sentence is most appropriate for a formal debate introduction?',
              options: ['The speaker explained the issue clearly and logically.', 'The speaker explain the issue clear and logic.', 'The speaker explaining the issue clearly and logical.', 'The speaker explained the issue clear and logical.'],
              answerText: 'The speaker explained the issue clearly and logically.',
            },
            {
              text: 'Choose the best way to complete the sentence: The committee ______ the report before making its decision.',
              options: ['studied', 'studies', 'study', 'studying'],
              answerText: 'studied',
            },
          ];
    if (useShort && roundIndex > 0) {
      const item = pickTemplate(templates);
      return makeShort(`In one sentence, explain the main idea of this prompt: ${item.text}`, 'A clear and complete answer is expected.');
    }
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isMath) {
    const templates = levelKey === 'primary'
      ? [
          { text: 'At a school fair, a teacher puts 4 pencils into each of 5 pencil cases. How many pencils are used altogether?', options: ['20', '18', '22', '24'], answerText: '20' },
          { text: 'The school library arranges 18 storybooks equally on 3 shelves. How many books are on each shelf?', options: ['6', '5', '7', '8'], answerText: '6' },
          { text: 'A bus carries 6 children in each row and there are 3 rows. How many children are seated?', options: ['18', '15', '20', '21'], answerText: '18' },
          { text: 'A gardener plants 25 seedlings in the morning and 14 more in the afternoon. How many seedlings are planted in total?', options: ['39', '40', '41', '38'], answerText: '39' },
        ]
      : levelKey === 'shs'
        ? [
            { text: 'A school transport company charges a fixed booking fee of 5 cedis plus 2 cedis per kilometre. If a trip is 4 km, what is the total cost?', options: ['13', '12', '14', '15'], answerText: '13' },
            { text: 'A school garden uses 25% of an 80-litre irrigation tank on Monday. How many litres are used?', options: ['20', '30', '40', '10'], answerText: '20' },
            { text: 'A student models the number of books borrowed each week with the rule y = 3x + 2, where x is the number of weeks. How many books are borrowed in week 4?', options: ['12', '14', '16', '10'], answerText: '14' },
            { text: 'A school project budget increases by 20% from 80 cedis. What is the new budget?', options: ['96', '88', '100', '92'], answerText: '96' },
          ]
        : [
            { text: 'A school canteen orders 12 trays of bottled water and each tray holds 8 bottles. How many bottles are ordered in total?', options: ['96', '86', '98', '88'], answerText: '96' },
            { text: 'The school theatre club shares 96 tickets equally among 8 classes. How many tickets does each class receive?', options: ['12', '10', '14', '16'], answerText: '12' },
            { text: 'A field trip costs 18 cedis for 3 buses. If the cost is shared equally, how much does each bus pay?', options: ['6', '5', '7', '8'], answerText: '6' },
            { text: 'During a science fair, 25% of 80 students volunteer to help. How many students volunteer?', options: ['20', '30', '40', '10'], answerText: '20' },
          ];
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isScience) {
    const templates = levelKey === 'primary'
      ? [
          { text: 'Which part of a plant takes in water from the soil?', options: ['Leaf', 'Root', 'Flower', 'Stem'], answerText: 'Root' },
          { text: 'What do we breathe in from the air?', options: ['Oxygen', 'Carbon dioxide', 'Smoke', 'Dust'], answerText: 'Oxygen' },
          { text: 'Which body part helps us think?', options: ['Heart', 'Brain', 'Lungs', 'Stomach'], answerText: 'Brain' },
          { text: 'What do plants need from the sun to make food?', options: ['Light', 'Water only', 'Soil only', 'Shadow'], answerText: 'Light' },
        ]
      : levelKey === 'shs'
        ? [
            { text: 'What process allows green plants to make food using sunlight?', options: ['Respiration', 'Photosynthesis', 'Digestion', 'Evaporation'], answerText: 'Photosynthesis' },
            { text: 'Water freezes at 0 degrees on which temperature scale?', options: ['Fahrenheit', 'Celsius', 'Kelvin', 'Rankine'], answerText: 'Celsius' },
            { text: 'Which gas do plants take in to make food during photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], answerText: 'Carbon dioxide' },
            { text: 'Which part of the human body pumps blood around the body?', options: ['Liver', 'Brain', 'Heart', 'Lungs'], answerText: 'Heart' },
          ]
        : [
            { text: 'Which gas do plants take in to make food during photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], answerText: 'Carbon dioxide' },
            { text: 'Which part of the human body pumps blood around the body?', options: ['Liver', 'Brain', 'Heart', 'Lungs'], answerText: 'Heart' },
            { text: 'Water freezes at 0 degrees on which temperature scale?', options: ['Fahrenheit', 'Celsius', 'Kelvin', 'Rankine'], answerText: 'Celsius' },
            { text: 'What process allows green plants to make food using sunlight?', options: ['Respiration', 'Photosynthesis', 'Digestion', 'Evaporation'], answerText: 'Photosynthesis' },
          ];
    const item = pickTemplate(templates);
    if (useShort && roundIndex > 0) {
      return makeShort(`Explain one reason why a ${item.answerText.toLowerCase()} is important in everyday life.`, 'A clear scientific explanation is expected.');
    }
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isSocial) {
    const templates = [
      { text: 'Which regional organisation helps countries in West Africa cooperate on trade and security?', options: ['United Nations', 'African Union', 'ECOWAS', 'ASEAN'], answerText: 'ECOWAS' },
      { text: 'What is the main purpose of a national budget in a country?', options: ['To collect taxes', 'To plan spending and revenue', 'To build schools only', 'To elect government officials'], answerText: 'To plan spending and revenue' },
      { text: 'Which element is most important for a democratic election to be fair?', options: ['Secret ballot', 'Forced voting', 'No observers', 'No campaign'], answerText: 'Secret ballot' },
      { text: 'What is the primary purpose of a map legend?', options: ['To show scale', 'To explain symbols', 'To measure distance', 'To show direction'], answerText: 'To explain symbols' },
    ];
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isComputing) {
    const templates = [
      { text: 'Which part of a computer manages hardware and software so programs can run?', options: ['Keyboard', 'Operating system', 'Printer', 'Router'], answerText: 'Operating system' },
      { text: 'A set of instructions a computer follows to solve a problem is called a', options: ['Internet', 'Network', 'Database', 'Algorithm'], answerText: 'Algorithm' },
      { text: 'Which of these is a safe online habit?', options: ['Sharing passwords', 'Using weak passwords', 'Ignoring updates', 'Keeping software updated'], answerText: 'Keeping software updated' },
    ];
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isFrench) {
    const templates = [
      { text: 'Which greeting is correct in French?', options: ['Bonjour', 'Adiós', 'Grazie', 'Hello'], answerText: 'Bonjour' },
      { text: 'Which word means “thank you” in French?', options: ['Merci', 'Bitte', 'Gracias', 'Danke'], answerText: 'Merci' },
      { text: 'Which phrase means “good morning” in French?', options: ['Bonne nuit', 'Bonjour', 'Au revoir', 'Merci'], answerText: 'Bonjour' },
    ];
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isRME) {
    const templates = [
      { text: 'Which action shows respect for other people in the classroom?', options: ['Sharing materials', 'Shouting loudly', 'Ignoring the teacher', 'Skipping lessons'], answerText: 'Sharing materials' },
      { text: 'Why is honesty important in school life?', options: ['It creates confusion', 'It builds trust', 'It wastes time', 'It causes problems'], answerText: 'It builds trust' },
      { text: 'Which value helps people live peacefully together?', options: ['Violence', 'Kindness', 'Dishonesty', 'Rudeness'], answerText: 'Kindness' },
    ];
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isCareer) {
    const templates = [
      { text: 'Which skill is most useful when working in a team?', options: ['Listening', 'Sleeping', 'Arguing', 'Ignoring others'], answerText: 'Listening' },
      { text: 'What should you do if you do not understand an instruction at work?', options: ['Ask for clarification', 'Ignore it', 'Do something else', 'Wait silently'], answerText: 'Ask for clarification' },
      { text: 'Which habit helps you become more productive at school?', options: ['Procrastinating', 'Planning your tasks', 'Avoiding questions', 'Working late without rest'], answerText: 'Planning your tasks' },
    ];
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  if (isGeneral) {
    const templates = levelKey === 'primary'
      ? [
          { text: 'Which habit helps you learn faster and stay organised?', options: ['Planning your study time', 'Ignoring feedback', 'Procrastinating', 'Skipping revision'], answerText: 'Planning your study time' },
          { text: 'What is a healthy way to respond when you feel challenged by a difficult question?', options: ['Give up quickly', 'Ask for help and keep trying', 'Copy a friend', 'Ignore it'], answerText: 'Ask for help and keep trying' },
          { text: 'Which action is a good way to support your classmates?', options: ['Share ideas kindly', 'Mock mistakes', 'Take all the credit', 'Ignore their needs'], answerText: 'Share ideas kindly' },
        ]
      : levelKey === 'shs'
        ? [
            { text: 'Which study habit improves long-term understanding most effectively?', options: ['Reading passively', 'Reviewing notes regularly', 'Copying answers', 'Ignoring feedback'], answerText: 'Reviewing notes regularly' },
            { text: 'What is the best response when a classmate disagrees with your idea respectfully?', options: ['Argue loudly', 'Listen and discuss calmly', 'Ignore them', 'Mock them'], answerText: 'Listen and discuss calmly' },
            { text: 'Which action shows strong leadership in a group project?', options: ['Taking charge and listening', 'Doing everything alone', 'Leaving work for others', 'Ignoring deadlines'], answerText: 'Taking charge and listening' },
          ]
        : [
            { text: 'Which habit helps you learn faster and stay organised?', options: ['Planning your study time', 'Ignoring feedback', 'Procrastinating', 'Skipping revision'], answerText: 'Planning your study time' },
            { text: 'What is a healthy way to respond when you feel challenged by a difficult question?', options: ['Give up quickly', 'Ask for help and keep trying', 'Copy a friend', 'Ignore it'], answerText: 'Ask for help and keep trying' },
            { text: 'Which action is a good way to support your classmates?', options: ['Share ideas kindly', 'Mock mistakes', 'Take all the credit', 'Ignore their needs'], answerText: 'Share ideas kindly' },
          ];
    const item = pickTemplate(templates);
    return makeMcq(item.text, item.options, item.answerText);
  }

  const first = 2 + Math.floor(rng() * 9);
  const second = 2 + Math.floor(rng() * 8);
  const answer = first * second;
  const distractors = [answer + 1, answer + 2, answer - 1].filter((value, index, list) => list.indexOf(value) === index);
  const options = [String(answer), ...distractors.slice(0, 3)];
  while (options.length < 4) {
    options.push(String(Number(answer) + options.length));
  }

  return makeMcq(`What is ${first} × ${second}?`, options, String(answer));
}

function getDefaultSettings(settings = {}) {
  return {
    level: settings.level || 'JHS',
    subject: settings.subject || 'All subjects',
    perRound: Number(settings.perRound) || 200,
    seconds: settings.seconds || 45,
    rounds: settings.rounds || 3,
    aiCount: settings.aiCount || 0,
    aiDiff: settings.aiDiff || 'medium',
  };
}

function clearAutoAdvance(room) {
  room.autoAdvance = false;
  room.autoAdvanceMs = 0;
  room.autoAdvanceAt = null;
}

function setQuestionDeadline(room, seconds = null) {
  const configuredSeconds = Number(seconds ?? room?.settings?.seconds ?? 45) || 45;
  const safeSeconds = Math.max(5, Math.min(180, configuredSeconds));
  room.deadline = Date.now() + safeSeconds * 1000;
  room.secondsRemaining = safeSeconds;
  return room.deadline;
}

function scheduleAutoAdvance(room, ms = 4000) {
  const delay = Math.max(0, Number(ms) || 0);
  room.autoAdvance = delay > 0;
  room.autoAdvanceMs = delay;
  room.autoAdvanceAt = delay > 0 ? Date.now() + delay : null;
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

function buildQuizMessage(room, outcome = 'intro', answerText = '', playerName = '') {
  const base = room && room.settings ? room.settings.subject : 'the quiz';
  const contestantName = String(playerName || '').trim() || 'the contestant';
  if (outcome === 'correct') {
    return `Aria, the moderator, awards 10 marks to ${contestantName} for the correct answer.`;
  }
  if (outcome === 'incorrect') {
    const answer = answerText ? ` The correct answer is ${answerText}.` : '';
    return `Aria, the moderator, says ${contestantName} missed that one.${answer} Aria will explain it clearly and keep the quiz moving.`;
  }
  if (outcome === 'skip') {
    return 'Aria, the moderator, moves the quiz forward so the pace stays lively.';
  }
  if (outcome === 'question') {
    return `Aria, the moderator, invites ${contestantName} to answer. Aria reads the question and the options clearly.`;
  }
  return `Aria, the moderator, welcomes everyone to ${base}. Aria will read each question and keep the scoreboard visible.`;
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
    autoAdvance: Boolean(room.autoAdvance),
    autoAdvanceMs: Number(room.autoAdvanceMs || 0),
    deadline: room.deadline || null,
  };
}

function advanceRoomQuestion(room) {
  clearAutoAdvance(room);
  const rounds = Math.max(1, Number(room.settings?.rounds) || 3);
  const perRound = Math.max(1, Number(room.settings?.perRound) || 200);
  room.qInRound = (room.qInRound || 0) + 1;
  if (room.qInRound >= perRound) {
    room.qInRound = 0;
    room.round = (room.round || 0) + 1;
  }

  if ((room.round || 0) >= rounds) {
    room.phase = 'finished';
    room.stage = 'results';
    room.qm = {
      id: `qm-${room.code}-${Date.now()}`,
      mood: 'gold',
      text: 'Quiz complete! See the final results and celebrate your top players.',
    };
    return;
  }

  room.revealed = false;
  room.stage = 'answering';
  room.correctIndex = null;
  room.ownResult = null;
  room.ownerId = room.hostId;
  setQuestionDeadline(room, room.settings?.seconds);
  room.question = buildRoomQuestion(room, room.round, room.qInRound);
  const currentPlayer = Array.isArray(room.players) ? room.players.find((player) => player.id === room.ownerId) || room.players[0] : null;
  room.qm = {
    id: `qm-${room.code}-${Date.now()}`,
    mood: 'sky',
    text: buildQuizMessage(room, 'question', '', currentPlayer?.name || '', room.question?.text || ''),
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
          text: buildQuizMessage({ settings: getDefaultSettings(safeBody.settings) }, 'intro'),
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
      clearAutoAdvance(room);
      room.questionSeed = room.questionSeed || generateRoomSeed(room.code);
      setQuestionDeadline(room, room.settings?.seconds);
      room.question = buildRoomQuestion(room, room.round, room.qInRound);
      room.qm = {
        id: `qm-${room.code}-${Date.now()}`,
        mood: 'sky',
        text: buildQuizMessage(room, 'question', '', room.players?.[0]?.name || '', room.question?.text || ''),
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
      scheduleAutoAdvance(room, 4000);
      room.ownResult = isCorrect ? 'correct' : 'incorrect';
      room.qm = {
        id: `qm-${room.code}-${Date.now()}`,
        mood: isCorrect ? 'mint' : 'coral',
        text: buildQuizMessage(room, isCorrect ? 'correct' : 'incorrect', answerText, player.name),
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
      advanceRoomQuestion(room);
      room.serverNow = Date.now();
      return createRoomSnapshot(room);
    }
    case 'next': {
      return buildLocalBackendResponse('skip', body);
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
