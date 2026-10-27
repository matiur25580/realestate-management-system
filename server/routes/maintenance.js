const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const rl = (req)=> (req.user.role||'').toLowerCase();

router.post('/', auth, async (req, res) => {
  const { propertyId, issue } = req.body;
  const m = await Maintenance.create({ property: propertyId, tenant: req.user.id, issue });
  res.json({ msg: 'Maintenance request created', m });
});

router.get('/my', auth, async (req, res) => {
  const list = await Maintenance.find({ tenant: req.user.id }).populate('property');
  res.json(list);
});

router.get('/all', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner','maintenance'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  let q = {};
  if(r==='owner'){
    const props = await Property.find({ $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }).select('_id');
    q.property = { $in: props.map(p=>p._id) };
  }
  const list = await Maintenance.find(q).populate('property').populate('tenant','fullName');
  res.json(list);
});

router.put('/:id', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner','maintenance'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  await Maintenance.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.json({ msg: 'Updated' });
});

module.exports = router;
