const test = require('node:test');
const assert = require('node:assert/strict');
const { isPropertyOwner } = require('./propertyOwnership');

test('recognizes ownerId when it matches the current user', () => {
  assert.equal(isPropertyOwner({ ownerId: 'user-1', owner: 'user-2' }, 'user-1'), true);
});

test('recognizes legacy owner field even when ownerId is populated differently', () => {
  assert.equal(isPropertyOwner({ ownerId: 'user-2', owner: 'user-1' }, 'user-1'), true);
});

test('does not treat a missing owner as a match', () => {
  assert.equal(isPropertyOwner({}, 'user-1'), false);
  assert.equal(isPropertyOwner(null, 'user-1'), false);
  assert.equal(isPropertyOwner({ owner: null }, null), false);
});
