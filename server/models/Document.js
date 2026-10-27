const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: false, default: null },
  title: { type: String, required: true, trim: true },
  category: { type: String, enum: ['lease_agreement','id_proof','property_paper','rent_receipt','other'], default: 'other' },
  fileData: { type: String, default: '' },
  fileName: { type: String, default: '' },
  mimeType: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
