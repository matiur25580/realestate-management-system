const mongoose = require('mongoose');
const rentSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true },
  status: { type: String, enum: ['pending','paid','overdue'], default: 'pending' },
  paidAt: { type: Date }
}, { timestamps: true });
module.exports = mongoose.model('Rent', rentSchema);
