const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, default: '' },
  visitDate: { type: Date, default: null },
  status: { type: String, default: 'pending' },
  // Present only while a booking is pending or approved.
  activeBookingKey: { type: String, select: false }
}, { timestamps: true, autoIndex: false });

bookingSchema.index(
  { activeBookingKey: 1 },
  { unique: true, sparse: true, name: 'uniq_active_booking_per_tenant_property' }
);

module.exports = mongoose.model('Booking', bookingSchema);
