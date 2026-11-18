const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicSignupRole } = require('./signupPolicy');

test('public signup always assigns the least-privileged Tenant role', () => {
  for (const requestedRole of ['Admin', 'Agent', 'Owner', 'Tenant', 'Maintenance', undefined]) {
    assert.equal(isPublicSignupRole(requestedRole), 'Tenant');
  }
});
