const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const Document = require('../models/Document');

const rl = (req) => String(req.user?.role || '').toLowerCase();

// POST / - upload document
router.post('/', auth, async (req, res) => {
  try {
    const { title, category, propertyId, fileData, fileName, mimeType } = req.body;
    if (!title) return res.status(400).json({ msg: 'title is required' });
    if (!fileData) return res.status(400).json({ msg: 'fileData is required' });
    if (String(fileData).length >= 7000000) return res.status(400).json({ msg: 'File too large. Max ~5MB allowed.' });
    const doc = await Document.create({
      uploadedBy: req.user.id,
      property: propertyId || null,
      title,
      category: category || 'other',
      fileData,
      fileName: fileName || '',
      mimeType: mimeType || ''
    });
    await logAudit(req, 'Document Uploaded', String(title));
    try { await notify(req.user.id, 'Document uploaded', String(title), 'document'); } catch (e) {}
    return res.status(201).json(doc);
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

// GET /my - my documents (admin sees all)
router.get('/my', auth, async (req, res) => {
  try {
    let docs;
    if (rl(req) === 'admin') {
      docs = await Document.find().populate('uploadedBy', 'fullName email').populate('property', 'title').sort({ createdAt: -1 });
    } else {
      docs = await Document.find({ uploadedBy: req.user.id }).populate('property', 'title').sort({ createdAt: -1 });
    }
    return res.json(docs);
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

// GET /all - admin only
router.get('/all', auth, async (req, res) => {
  try {
    if (rl(req) !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    const docs = await Document.find().populate('uploadedBy', 'fullName email').populate('property', 'title').sort({ createdAt: -1 });
    return res.json(docs);
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

// GET /:id/download
router.get('/:id/download', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });
    const isAdmin = rl(req) === 'admin';
    const isOwner = String(doc.uploadedBy) === String(req.user.id);
    if (!isAdmin && !isOwner) return res.status(403).json({ msg: 'Not authorized' });
    return res.json({ fileData: doc.fileData, fileName: doc.fileName, mimeType: doc.mimeType });
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });
    const isAdmin = rl(req) === 'admin';
    const isOwner = String(doc.uploadedBy) === String(req.user.id);
    if (!isAdmin && !isOwner) return res.status(403).json({ msg: 'Not authorized' });
    await doc.deleteOne();
    await logAudit(req, 'Document Deleted', String(doc.title));
    return res.json({ msg: 'Document deleted' });
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

module.exports = router;
