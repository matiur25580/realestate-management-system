const mongoose = require('mongoose');

const tenantRatingSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String }
}, { timestamps: true });

tenantRatingSchema.index({ tenant: 1, ratedBy: 1, property: 1 }, { unique: true });

module.exports = mongoose.model('TenantRating', tenantRatingSchema);
