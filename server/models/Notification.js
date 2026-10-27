const mongoose = require('mongoose');
module.exports = mongoose.model('Notification', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  type: { type: String, enum: ['info','success','warning'], default: 'info' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true }));
