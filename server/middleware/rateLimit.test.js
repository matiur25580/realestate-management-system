const test = require('node:test');
const assert = require('node:assert/strict');
const createRateLimit = require('./rateLimit');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('limits repeated requests from the same resolved IP', () => {
  const limit = createRateLimit({ windowMs: 60_000, max: 1, message: 'Too many attempts.' });
  let passed = 0;
  const req = { ip: '203.0.113.5', socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '198.51.100.2' } };
  limit(req, response(), () => { passed += 1; });
  const blocked = response();
  limit(req, blocked, () => { passed += 1; });
  assert.equal(passed, 1);
  assert.equal(blocked.statusCode, 429);
});

test('keeps different client IPs in separate buckets', () => {
  const limit = createRateLimit({ windowMs: 60_000, max: 1, message: 'Too many attempts.' });
  let passed = 0;
  for (const ip of ['203.0.113.5', '203.0.113.6']) {
    limit({ ip, headers: {} }, response(), () => { passed += 1; });
  }
  assert.equal(passed, 2);
});
