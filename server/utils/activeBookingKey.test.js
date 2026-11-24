const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACTIVE_BOOKING_INDEX,
  makeActiveBookingKey,
  assertActiveBookingIndex,
} = require('./activeBookingKey');

test('builds a stable key from the property and tenant identifiers', () => {
  assert.equal(makeActiveBookingKey('property-1', 'tenant-1'), 'property-1:tenant-1');
  assert.equal(makeActiveBookingKey('property-1', 'tenant-2'), 'property-1:tenant-2');
});

test('rejects missing identifiers when building an active booking key', () => {
  assert.throws(() => makeActiveBookingKey(null, 'tenant-1'), /Both propertyId and tenantId/);
  assert.throws(() => makeActiveBookingKey('property-1', undefined), /Both propertyId and tenantId/);
});

test('allows startup only when the unique sparse index exists and all active bookings are keyed', async () => {
  const Booking = {
    collection: {
      indexes: async () => [{ name: ACTIVE_BOOKING_INDEX, unique: true, sparse: true, key: { activeBookingKey: 1 } }],
    },
    countDocuments: async () => 0,
  };
  await assert.doesNotReject(assertActiveBookingIndex(Booking));
});

test('blocks startup while legacy active bookings still need migration', async () => {
  const Booking = {
    collection: {
      indexes: async () => [{ name: ACTIVE_BOOKING_INDEX, unique: true, sparse: true, key: { activeBookingKey: 1 } }],
    },
    countDocuments: async () => 2,
  };
  await assert.rejects(assertActiveBookingIndex(Booking), /uniqueness is not ready/);
});

test('blocks startup when the unique sparse index is missing', async () => {
  const Booking = {
    collection: { indexes: async () => [] },
    countDocuments: async () => 0,
  };
  await assert.rejects(assertActiveBookingIndex(Booking), /uniqueness is not ready/);
});

test('Booking schema declares a unique sparse index for active booking keys', () => {
  const Booking = require('../models/Booking');
  const activeIndex = Booking.schema.indexes().find(([keys, options]) =>
    keys.activeBookingKey === 1 && options.name === ACTIVE_BOOKING_INDEX
  );
  assert.ok(activeIndex, 'active booking index should be declared');
  assert.equal(activeIndex[1].unique, true);
  assert.equal(activeIndex[1].sparse, true);
  assert.equal(Booking.schema.path('activeBookingKey').options.select, false);
});
