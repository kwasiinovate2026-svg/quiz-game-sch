import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLocalBackendResponse, getBackendTargetUrl, normalizeBackendUrl } from '../src/backend-utils.js';

test('rejects placeholder backend URLs', () => {
  assert.equal(normalizeBackendUrl('https://api'), null);
  assert.equal(normalizeBackendUrl('api'), null);
});

test('builds backend target URLs from a configured base URL', () => {
  assert.equal(getBackendTargetUrl('https://example.com', 'login'), 'https://example.com/login');
  assert.equal(getBackendTargetUrl('https://example.com/', '/login/'), 'https://example.com/login');
});

test('builds a local fallback response for API actions', () => {
  assert.equal(buildLocalBackendResponse('login', { email: 'user@example.com' }).ok, true);
  assert.equal(buildLocalBackendResponse('league').ok, true);
  assert.equal(buildLocalBackendResponse('answer').correct, true);
});

test('builds a local create room response with a code and host assignment', () => {
  const result = buildLocalBackendResponse('create', { playerId: 'host-1', name: 'Alice', settings: { level: 'JHS', subject: 'All subjects' } });
  assert.equal(result.ok, true);
  assert.equal(result.code.length, 4);
  assert.equal(result.phase, 'lobby');
  assert.equal(result.hostId, 'host-1');
  assert.equal(result.players[0].displayName, 'Alice');
});

test('join keeps the original host and adds the new player as a guest', () => {
  const created = buildLocalBackendResponse('create', { playerId: 'host-1', name: 'Alice' });
  const joined = buildLocalBackendResponse('join', { code: created.code, playerId: 'guest-2', name: 'Bob' });
  assert.equal(joined.hostId, 'host-1');
  assert.equal(joined.players.length, 2);
  assert.equal(joined.players[1].displayName, 'Bob');
});

test('start generates different questions for different rooms', () => {
  const roomA = buildLocalBackendResponse('create', { playerId: 'host-1', name: 'Alice', settings: { level: 'JHS', subject: 'Mathematics' } });
  const roomB = buildLocalBackendResponse('create', { playerId: 'host-2', name: 'Bob', settings: { level: 'JHS', subject: 'Mathematics' } });
  const startedA = buildLocalBackendResponse('start', { code: roomA.code, playerId: 'host-1', name: 'Alice' });
  const startedB = buildLocalBackendResponse('start', { code: roomB.code, playerId: 'host-2', name: 'Bob' });

  assert.notEqual(startedA.question.text, startedB.question.text);
});

test('answering a correct multiple-choice response reveals the result and awards points', () => {
  const created = buildLocalBackendResponse('create', { playerId: 'host-1', name: 'Alice', settings: { level: 'JHS', subject: 'Mathematics' } });
  const started = buildLocalBackendResponse('start', { code: created.code, playerId: 'host-1', name: 'Alice' });
  const answered = buildLocalBackendResponse('answer', { code: created.code, playerId: 'host-1', choice: started.question.answerIndex });

  assert.equal(answered.ok, true);
  assert.equal(answered.revealed, true);
  assert.equal(answered.ownResult, 'correct');
  assert.ok(answered.players.some((player) => player.id === 'host-1' && player.score > 0));
  assert.match(answered.qm.text, /correct|nice/i);
});

test('answer reveals expose automatic turn advance information', () => {
  const created = buildLocalBackendResponse('create', { playerId: 'host-1', name: 'Alice', settings: { level: 'JHS', subject: 'Mathematics' } });
  const started = buildLocalBackendResponse('start', { code: created.code, playerId: 'host-1', name: 'Alice' });
  const answered = buildLocalBackendResponse('answer', { code: created.code, playerId: 'host-1', choice: started.question.answerIndex });

  assert.equal(answered.stage, 'reveal');
  assert.equal(answered.autoAdvance, true);
  assert.ok(Number(answered.autoAdvanceMs) >= 3000);
});

test('starts each question with a deadline based on the configured seconds', () => {
  const created = buildLocalBackendResponse('create', {
    playerId: 'host-1',
    name: 'Alice',
    settings: { level: 'JHS', subject: 'Mathematics', seconds: 30 },
  });
  const started = buildLocalBackendResponse('start', { code: created.code, playerId: 'host-1', name: 'Alice' });

  assert.ok(Number(started.deadline) > Date.now());
  assert.ok(Number(started.deadline) <= Date.now() + 31000);
});

test('skip advances the room and ends the quiz after the final question', () => {
  const created = buildLocalBackendResponse('create', {
    playerId: 'host-1',
    name: 'Alice',
    settings: { level: 'JHS', subject: 'Mathematics', rounds: 1, perRound: 1 },
  });
  const started = buildLocalBackendResponse('start', { code: created.code, playerId: 'host-1', name: 'Alice' });
  const answered = buildLocalBackendResponse('answer', { code: created.code, playerId: 'host-1', choice: started.question.answerIndex });
  const next = buildLocalBackendResponse('skip', { code: created.code });

  assert.equal(answered.phase, 'playing');
  assert.equal(answered.stage, 'reveal');
  assert.equal(next.phase, 'finished');
  assert.equal(next.stage, 'results');
});
