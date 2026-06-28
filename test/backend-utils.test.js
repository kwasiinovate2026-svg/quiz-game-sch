import test from 'node:test';
import assert from 'node:assert/strict';

import { getBackendTargetUrl, normalizeBackendUrl } from '../src/backend-utils.js';

test('rejects placeholder backend URLs', () => {
  assert.equal(normalizeBackendUrl('https://api'), null);
  assert.equal(normalizeBackendUrl('api'), null);
});

test('builds backend target URLs from a configured base URL', () => {
  assert.equal(getBackendTargetUrl('https://example.com', 'login'), 'https://example.com/login');
  assert.equal(getBackendTargetUrl('https://example.com/', '/login/'), 'https://example.com/login');
});
