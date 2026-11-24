require('dotenv').config();
const connectDB = require('../config/db');
const Booking = require('../models/Booking');
const {
  ACTIVE_BOOKING_STATUSES,
  ACTIVE_BOOKING_INDEX,
  makeActiveBookingKey,
} = require('../utils/activeBookingKey');

async function migrate() {
  const apply = process.argv.includes('--apply');
  await connectDB();

  const duplicates = await Booking.aggregate([
    { $match: { status: { $in: ACTIVE_BOOKING_STATUSES } } },
    { $group: {
      _id: { property: '$property', tenant: '$tenant' },
      count: { $sum: 1 },
      bookingIds: { $push: '$_id' },
    } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 100 },
  ]);

  if (duplicates.length) {
    console.error('Migration stopped: duplicate active bookings already exist. Resolve these records manually before applying the unique constraint.');
    console.error(JSON.stringify(duplicates, null, 2));
    process.exitCode = 1;
    return;
  }

  const activeBookings = await Booking.find({
    status: { $in: ACTIVE_BOOKING_STATUSES },
  }).select('_id property tenant').lean();

  console.log('Preflight passed.');
  console.log('Active bookings to key:', activeBookings.length);
  console.log('Existing duplicate active pairs:', 0);

  if (!apply) {
    console.log('Dry run only. Stop the API, then rerun with --apply to backfill keys and create the unique index.');
    return;
  }

  // Run with the API stopped so no legacy writer can create an unkeyed active booking mid-migration.
  await Booking.updateMany({}, { $unset: { activeBookingKey: '' } });

  for (const booking of activeBookings) {
    await Booking.updateOne(
      { _id: booking._id, status: { $in: ACTIVE_BOOKING_STATUSES } },
      { $set: { activeBookingKey: makeActiveBookingKey(booking.property, booking.tenant) } }
    );
  }

  await Booking.collection.createIndex(
    { activeBookingKey: 1 },
    { unique: true, sparse: true, name: ACTIVE_BOOKING_INDEX }
  );

  const remaining = await Booking.countDocuments({
    status: { $in: ACTIVE_BOOKING_STATUSES },
    activeBookingKey: { $exists: false },
  });
  if (remaining) {
    throw new Error('Migration incomplete: ' + remaining + ' active bookings are missing their uniqueness key.');
  }

  console.log('Migration complete. Unique active-booking index is ready.');
}

migrate()
  .catch(error => {
    console.error('Active booking migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect().catch(() => {});
  });
