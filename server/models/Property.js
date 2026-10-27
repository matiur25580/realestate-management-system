const mongoose = require('mongoose');
const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Flat','House','Office','Shop'], default: 'Flat' },
  price: { type: Number, required: true },
  area: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  image: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' }
}, { timestamps: true });
module.exports = mongoose.model('Property', propertySchema);
