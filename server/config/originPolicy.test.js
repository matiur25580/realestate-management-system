const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAllowedOrigins, isAllowedOrigin } = require('./originPolicy');

test('parses and deduplicates explicit origins', () => {
  assert.deepEqual(
    parseAllowedOrigins('https://app.example.com,https://app.example.com,https://admin.example.com', 'production'),
    ['https://app.example.com', 'https://admin.example.com'],
  );
});

test('rejects wildcard, malformed origins and URL paths', () => {
  assert.throws(() => parseAllowedOrigins('*', 'production'), /wildcard/);
  assert.throws(() => parseAllowedOrigins('invalid-origin', 'production'), /valid absolute/);
  assert.throws(() => parseAllowedOrigins('https://app.example.com/dashboard', 'production'), /plain HTTP/);
});

test('requires an explicit production origin and defaults to local Vite in development', () => {
  assert.throws(() => parseAllowedOrigins('', 'production'), /must be configured/);
  assert.deepEqual(parseAllowedOrigins('', 'development'), ['http://localhost:5173']);
});

test('allows exact configured origins and requests without an Origin header', () => {
  const allowed = ['https://app.example.com'];
  assert.equal(isAllowedOrigin('https://app.example.com', allowed), true);
  assert.equal(isAllowedOrigin('https://attacker.example', allowed), false);
  assert.equal(isAllowedOrigin('null', allowed), false);
  assert.equal(isAllowedOrigin(undefined, allowed), true);
});
