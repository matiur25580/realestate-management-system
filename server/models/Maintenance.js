const mongoose = require('mongoose');
const maintenanceSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issue: { type: String, required: true },
  status: { type: String, default: 'pending' },
  note: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Maintenance', maintenanceSchema);
