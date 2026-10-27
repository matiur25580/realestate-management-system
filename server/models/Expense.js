const mongoose = require('mongoose');
module.exports = mongoose.model('Expense', new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['Maintenance','Repair','Tax','Insurance','Utilities','Other'], default: 'Other' },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
}, { timestamps: true }));
