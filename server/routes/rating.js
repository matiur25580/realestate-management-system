const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const TenantRating = require('../models/TenantRating');

const rl = (req) => String(req.user?.role || '').toLowerCase();

router.post('/', auth, async (req, res) => {
  try {
    const role = rl(req);
    if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ msg: 'Not authorized' });
    const { tenantId, propertyId, rating, comment } = req.body;
    if (!tenantId || !rating) return res.status(400).json({ msg: 'tenantId and rating required' });
    const prop = propertyId || null;
    const doc = await TenantRating.findOneAndUpdate(
      { tenant: tenantId, ratedBy: req.user.id, property: prop },
      { tenant: tenantId, ratedBy: req.user.id, property: prop, rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await notify(tenantId, 'New tenant rating', 'You received a ' + rating + '-star rating', 'rating');
    logAudit(req, 'Tenant Rated', rating + ' stars');
    return res.json(doc);
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

router.get('/tenant/:tid', auth, async (req, res) => {
  try {
    const ratings = await TenantRating.find({ tenant: req.params.tid })
      .populate('ratedBy', 'fullName')
      .populate('property', 'title');
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
    return res.json({ ratings, average: avg, count: ratings.length });
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

router.get('/my', auth, async (req, res) => {
  try {
    const ratings = await TenantRating.find({ tenant: req.user.id })
      .populate('ratedBy', 'fullName')
      .populate('property', 'title');
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
    return res.json({ ratings, average: avg, count: ratings.length });
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

router.get('/all', auth, async (req, res) => {
  try {
    if (rl(req) !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    const ratings = await TenantRating.find()
      .populate('tenant', 'fullName')
      .populate('ratedBy', 'fullName')
      .populate('property', 'title');
    return res.json(ratings);
  } catch (e) { return res.status(500).json({ msg: e.message }); }
});

module.exports = router;
