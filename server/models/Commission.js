const mongoose = require('mongoose');
module.exports = mongoose.model('Commission', new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  amount: { type: Number, required: true },
  percent: { type: Number, default: 2 },
  status: { type: String, enum: ['pending','paid'], default: 'pending' },
}, { timestamps: true }));
