const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const SiteVisit = require('../models/SiteVisit');
const Property = require('../models/Property');

const rl = (req) => String(req.user?.role || '').toLowerCase();

// POST / - tenant books a site visit
router.post('/', auth, async (req, res) => {
  try {
    const { propertyId, date, timeSlot, notes } = req.body;
    if (!propertyId || !date || !timeSlot) return res.status(400).json({ msg: 'propertyId, date and timeSlot required' });
    const visit = await SiteVisit.create({ property: propertyId, tenant: req.user.id, date, timeSlot, notes: notes || '' });
    try {
      const prop = await Property.findById(propertyId).select('agentId ownerId owner title').lean();
      const target = prop?.agentId || prop?.ownerId || prop?.owner;
      if (target) await notify(target, 'New Site Visit Request', 'Visit for "' + (prop?.title || '') + '" on ' + date + ' (' + timeSlot + ')', 'info');
    } catch (e) {}
    logAudit(req, 'Site Visit Booked', timeSlot + ' on ' + date);
    return res.status(201).json(visit);
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

// GET /my - role-based visits
router.get('/my', auth, async (req, res) => {
  try {
    const role = rl(req);
    const me = req.user.id;
    let filter = {};
    if (role === 'tenant') filter = { tenant: me };
    else if (role === 'agent') {
      const myProps = await Property.find({ agentId: me }).select('_id').lean();
      filter = { $or: [{ agent: me }, { property: { $in: myProps.map(p => p._id) } }] };
    } else if (role === 'owner') {
      const myProps = await Property.find({ $or: [{ owner: me }, { ownerId: me }] }).select('_id').lean();
      filter = { property: { $in: myProps.map(p => p._id) } };
    }
    const visits = await SiteVisit.find(filter)
      .populate('property', 'title city')
      .populate('tenant', 'fullName email')
      .populate('agent', 'fullName email')
      .sort({ date: 1 });
    return res.json(visits);
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

// PUT /:id - staff updates status / assigns agent
router.put('/:id', auth, async (req, res) => {
  try {
    const role = rl(req);
    if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ msg: 'Not allowed' });
    const v = await SiteVisit.findById(req.params.id).populate('property', 'title');
    if (!v) return res.status(404).json({ msg: 'Not found' });
    if (req.body.status) v.status = req.body.status;
    if (req.body.agentId && role === 'admin') v.agent = req.body.agentId || null;
    if (req.body.notes !== undefined) v.notes = req.body.notes;
    await v.save();
    try { await notify(v.tenant, 'Site Visit ' + v.status, 'Your visit for "' + (v.property?.title || '') + '" is now ' + v.status + '.', v.status === 'confirmed' ? 'success' : 'info'); } catch (e) {}
    logAudit(req, 'Site Visit ' + v.status, (v.property?.title || ''));
    return res.json(v);
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

// DELETE /:id - tenant cancels own pending visit, admin any
router.delete('/:id', auth, async (req, res) => {
  try {
    const v = await SiteVisit.findById(req.params.id);
    if (!v) return res.status(404).json({ msg: 'Not found' });
    const role = rl(req);
    if (role !== 'admin') {
      if (String(v.tenant) !== String(req.user.id)) return res.status(403).json({ msg: 'Not allowed' });
      if (v.status !== 'pending') return res.status(400).json({ msg: 'Only pending visits can be cancelled' });
    }
    await v.deleteOne();
    logAudit(req, 'Site Visit Cancelled', '');
    return res.json({ msg: 'Visit cancelled' });
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

module.exports = router;
