const ACTIVE_BOOKING_STATUSES = ['pending', 'approved'];
const ACTIVE_BOOKING_INDEX = 'uniq_active_booking_per_tenant_property';

function makeActiveBookingKey(propertyId, tenantId) {
  if (propertyId === undefined || propertyId === null || tenantId === undefined || tenantId === null) {
    throw new TypeError('Both propertyId and tenantId are required to build an active booking key.');
  }
  return String(propertyId) + ':' + String(tenantId);
}

async function assertActiveBookingIndex(Booking) {
  const [indexes, unkeyedActiveBookings] = await Promise.all([
    Booking.collection.indexes(),
    Booking.countDocuments({
      status: { $in: ACTIVE_BOOKING_STATUSES },
      activeBookingKey: { $exists: false },
    }),
  ]);
  const indexReady = indexes.some(index =>
    index.name === ACTIVE_BOOKING_INDEX
    && index.unique === true
    && index.sparse === true
    && index.key?.activeBookingKey === 1
  );
  if (!indexReady || unkeyedActiveBookings > 0) {
    throw new Error(
      'Active booking uniqueness is not ready. Stop the API, run "npm run migrate:active-booking-key -- --apply" from server/, then restart.'
    );
  }
}

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  ACTIVE_BOOKING_INDEX,
  makeActiveBookingKey,
  assertActiveBookingIndex,
};
