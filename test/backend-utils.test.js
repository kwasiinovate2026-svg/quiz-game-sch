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
