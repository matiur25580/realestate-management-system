const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, default: '' },
  visitDate: { type: Date, default: null },
  status: { type: String, default: 'pending' }
}, { timestamps: true });
module.exports = mongoose.model('Booking', bookingSchema);
