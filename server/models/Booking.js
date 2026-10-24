const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Applied','Approved','Rejected','Active'], default: 'Applied' },
  rentAmount: { type: Number, required: true },
  agreementPdf: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('Booking', bookingSchema);
