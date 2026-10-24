const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contactNumber: { type: String, required: true },
  dob: { type: String, required: true },
  role: { type: String, enum: ['Admin','Agent','Owner','Tenant','Maintenance'], required: true },
  uniqueId: { type: String, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
