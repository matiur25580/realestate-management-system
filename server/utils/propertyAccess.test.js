const test = require('node:test');
const assert = require('node:assert/strict');
const { propertyManagerFilter } = require('./propertyAccess');

test('admin property scope includes any requested property', () => {
  assert.deepEqual(propertyManagerFilter({ id: 'admin-1', role: 'Admin' }, 'property-1'), { _id: 'property-1' });
});

test('owner property scope matches ownerId or legacy owner field', () => {
  assert.deepEqual(propertyManagerFilter({ id: 'owner-1', role: 'Owner' }, 'property-1'), {
    _id: 'property-1',
    $or: [{ ownerId: 'owner-1' }, { owner: 'owner-1' }]
  });
});

test('agent property scope requires assignment to the current agent', () => {
  assert.deepEqual(propertyManagerFilter({ id: 'agent-1', role: 'Agent' }), { agentId: 'agent-1' });
});

test('tenant and unknown roles cannot manage properties', () => {
  assert.equal(propertyManagerFilter({ id: 'tenant-1', role: 'Tenant' }, 'property-1'), null);
  assert.equal(propertyManagerFilter(null, 'property-1'), null);
});
