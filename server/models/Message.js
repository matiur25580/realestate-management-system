const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, default: '' },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });
messageSchema.index({ receiver: 1, read: 1 });
module.exports = mongoose.model('Message', messageSchema);
