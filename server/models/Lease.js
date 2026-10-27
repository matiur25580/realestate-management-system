const mongoose = require('mongoose');
const leaseSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  monthlyRent: { type: Number, required: true },
  deposit: { type: Number, default: 0 },
  terms: { type: String, default: '' },
  status: { type: String, enum: ['active','expired','terminated'], default: 'active' }
}, { timestamps: true });
module.exports = mongoose.model('Lease', leaseSchema);
