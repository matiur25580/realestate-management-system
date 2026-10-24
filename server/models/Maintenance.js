const mongoose = require('mongoose');
const maintenanceSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issue: { type: String, required: true },
  status: { type: String, enum: ['Open','Assigned','Fixed'], default: 'Open' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Maintenance', maintenanceSchema);
