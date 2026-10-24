const mongoose = require('mongoose');
const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Flat','House','Office','Shop'], required: true },
  price: { type: Number, required: true },
  area: { type: String, required: true },
  bhk: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true },
  status: { type: String, enum: ['Available','Rented','Sold'], default: 'Available' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  images: [String],
}, { timestamps: true });
module.exports = mongoose.model('Property', propertySchema);
